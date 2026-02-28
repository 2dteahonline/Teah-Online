// ===================== CHARACTER SPRITE SYSTEM =====================
// Client rendering: color utils, spritesheet, big character renderer
// Extracted from index_2.html — Phase C

// ===================== COLOR UTILS =====================
function parseHex(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
function toHex(r, g, b) {
  return '#' + [r,g,b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2,'0')).join('');
}
function darkenColor(hex, factor) {
  const [r,g,b] = parseHex(hex);
  return toHex(r * factor, g * factor, b * factor);
}
function lightenColor(hex, factor) {
  const [r,g,b] = parseHex(hex);
  return toHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
}
// Skin-aware shading: darken skin toward a warm shadow tone
function skinShadow(hex, amount) {
  const [r,g,b] = parseHex(hex);
  return toHex(r * (1 - amount * 0.3), g * (1 - amount * 0.4), b * (1 - amount * 0.45));
}
function skinHighlight(hex, amount) {
  const [r,g,b] = parseHex(hex);
  return toHex(r + (255 - r) * amount, g + (245 - g) * amount * 0.8, b + (230 - b) * amount * 0.6);
}

// ===================== SPRITESHEET SYSTEM (3-Layer) =====================
// 3 separate layers rendered on top of each other:
//   1. BODY (base layer) — torso, arms, legs, feet  → 48w × 64h per frame
//   2. HEAD (middle layer) — face, hair, skin       → 48w × 48h per frame
//   3. HAT  (top layer) — headwear, accessories     → 48w × 48h per frame
//
// Each sheet: 4 columns (frames) x 4 rows (directions)
// Row 0 = Down, Row 1 = Up, Row 2 = Left, Row 3 = Right
// Col 0 = Idle, Col 1-3 = Walk frames
const SPRITE_COLS = 4;
const SPRITE_ROWS = 4;
const DIR_TO_ROW = { 0: 0, 1: 1, 2: 2, 3: 3 };

// Per-layer frame dimensions
const LAYER_SIZES = {
  body: { w: 48, h: 64 },  // taller for torso + legs + feet
  head: { w: 48, h: 48 },
  hat:  { w: 48, h: 48 },
};

// Spritesheet registry
const spritesheets = {};
let spritesheetReady = {};

function loadSpritesheet(name, src) {
  const img = new Image();
  img.onload = () => { spritesheets[name] = img; spritesheetReady[name] = true; };
  img.onerror = () => { spritesheetReady[name] = false; };
  img.src = src;
}

// Generate a template sheet for a specific layer
function generateLayerTemplate(label, layer, outlineColor) {
  const lw = LAYER_SIZES[layer].w, lh = LAYER_SIZES[layer].h;
  const c = document.createElement('canvas');
  c.width = lw * SPRITE_COLS;
  c.height = lh * SPRITE_ROWS;
  const cx = c.getContext('2d');
  cx.clearRect(0, 0, c.width, c.height);

  const dirLabels = ['DOWN', 'UP', 'LEFT', 'RIGHT'];
  const frameLabels = ['IDLE', 'WALK1', 'WALK2', 'WALK3'];

  for (let row = 0; row < SPRITE_ROWS; row++) {
    for (let col = 0; col < SPRITE_COLS; col++) {
      const x = col * lw, y = row * lh;

      cx.fillStyle = (row + col) % 2 === 0 ? 'rgba(40,40,50,0.3)' : 'rgba(50,50,60,0.2)';
      cx.fillRect(x, y, lw, lh);
      cx.strokeStyle = 'rgba(100,100,120,0.5)';
      cx.lineWidth = 1;
      cx.strokeRect(x, y, lw, lh);

      // Crosshair
      cx.strokeStyle = 'rgba(80,80,100,0.3)';
      cx.beginPath();
      cx.moveTo(x + lw/2, y + 4); cx.lineTo(x + lw/2, y + lh - 4);
      cx.moveTo(x + 4, y + lh/2); cx.lineTo(x + lw - 4, y + lh/2);
      cx.stroke();

      // Layer-specific placeholder silhouette
      cx.fillStyle = outlineColor || 'rgba(100,200,150,0.15)';
      const legOff = col > 0 ? (col % 2 === 1 ? 2 : -2) : 0;

      if (layer === 'body') {
        // Torso (centered in 48x64)
        cx.fillRect(x + 16, y + 4, 16, 18);
        // Arms
        cx.fillRect(x + 10, y + 4, 6, 16);
        cx.fillRect(x + 32, y + 4, 6, 16);
        // Legs
        cx.fillRect(x + 17, y + 22 - legOff, 6, 20);
        cx.fillRect(x + 25, y + 22 + legOff, 6, 20);
        // Feet
        cx.fillRect(x + 15, y + 42 - legOff, 8, 5);
        cx.fillRect(x + 25, y + 42 + legOff, 8, 5);
      } else if (layer === 'head') {
        // Head centered in 48x48
        cx.beginPath(); cx.arc(x + 24, y + 22, 14, 0, Math.PI * 2); cx.fill();
        // Neck hint
        cx.fillRect(x + 21, y + 34, 6, 6);
      } else if (layer === 'hat') {
        // Hat on top portion of 48x48
        cx.fillRect(x + 12, y + 8, 24, 8);
        cx.fillRect(x + 16, y + 10, 16, 14);
      }

      // Label
      cx.font = '7px monospace';
      cx.fillStyle = 'rgba(180,180,200,0.6)';
      cx.textAlign = 'center';
      cx.fillText(dirLabels[row] + '-' + frameLabels[col], x + lw/2, y + lh - 2);
    }
  }

  cx.font = 'bold 8px monospace';
  cx.fillStyle = '#aaa';
  cx.textAlign = 'left';
  cx.fillText((label || 'TEMPLATE') + ' [' + layer.toUpperCase() + ']', 2, 8);
  return c;
}

// Generate templates for all characters × all layers
function initTemplatesheets() {
  const layerNames = ['body', 'head', 'hat'];
  const layerColors = { body: 'rgba(80,200,120,0.2)', head: 'rgba(200,160,100,0.2)', hat: 'rgba(100,120,200,0.2)' };

  // Player
  layerNames.forEach(layer => {
    const sheet = generateLayerTemplate('PLAYER', layer, layerColors[layer]);
    spritesheets['player_' + layer] = sheet;
    spritesheetReady['player_' + layer] = true;
  });

  // Mobs
  const mobColors = {
    grunt: 'rgba(120,90,70,0.2)', runner: 'rgba(200,160,60,0.2)',
    tank: 'rgba(100,100,120,0.2)', witch: 'rgba(140,60,180,0.2)',
    skeleton: 'rgba(200,200,200,0.2)', golem: 'rgba(100,100,100,0.2)', mini_golem: 'rgba(120,120,120,0.2)',
    mummy: 'rgba(180,160,100,0.2)', archer: 'rgba(60,60,60,0.2)',
    healer: 'rgba(60,200,60,0.2)',
  };
  for (const [name, color] of Object.entries(mobColors)) {
    layerNames.forEach(layer => {
      const sheet = generateLayerTemplate(name.toUpperCase(), layer, color);
      spritesheets[name + '_' + layer] = sheet;
      spritesheetReady[name + '_' + layer] = true;
    });
  }
}

// Draw a layered character (body → head → hat)
// All layers align at center-bottom of the character
function drawLayeredSprite(baseName, worldX, worldY, dir, frame, moving, scale) {
  const bodySheet = spritesheets[baseName + '_body'];
  const headSheet = spritesheets[baseName + '_head'];
  const hatSheet  = spritesheets[baseName + '_hat'];

  if (!bodySheet && !headSheet) return false;

  const row = DIR_TO_ROW[dir] || 0;
  let col = 0;
  if (moving) col = 1 + (Math.floor(frame) % 3);
  const s = scale || 1;

  // Body: 48x64 frames — aligned to bottom
  if (bodySheet) {
    const bw = LAYER_SIZES.body.w, bh = LAYER_SIZES.body.h;
    const srcX = col * bw, srcY = row * bh;
    const drawW = bw * s, drawH = bh * s;
    ctx.drawImage(bodySheet, srcX, srcY, bw, bh,
      worldX - drawW/2, worldY - drawH + 6, drawW, drawH);
  }

  // Head: 48x48 frames — sits on top of body
  // Head bottom aligns with top of body (offset up by body height - overlap)
  if (headSheet) {
    const hw = LAYER_SIZES.head.w, hh = LAYER_SIZES.head.h;
    const bh = LAYER_SIZES.body.h;
    const srcX = col * hw, srcY = row * hh;
    const drawW = hw * s, drawH = hh * s;
    // Head positioned so its bottom overlaps top of body by ~12px
    const headY = worldY - (bh * s) + 6 - (drawH - 12 * s);
    ctx.drawImage(headSheet, srcX, srcY, hw, hh,
      worldX - drawW/2, headY, drawW, drawH);
  }

  // Hat: 48x48 frames — sits on top of head
  if (hatSheet) {
    const hw2 = LAYER_SIZES.hat.w, hh2 = LAYER_SIZES.hat.h;
    const bh = LAYER_SIZES.body.h, headH = LAYER_SIZES.head.h;
    const srcX = col * hw2, srcY = row * hh2;
    const drawW = hw2 * s, drawH = hh2 * s;
    // Hat at same position as head (drawn on top)
    const headY = worldY - (bh * s) + 6 - ((headH * s) - 12 * s);
    ctx.drawImage(hatSheet, srcX, srcY, hw2, hh2,
      worldX - drawW/2, headY, drawW, drawH);
  }

  return true;
}

// Export a specific layer template
function exportSpriteTemplate(name) {
  const sheet = spritesheets[name] || spritesheets[name + '_body'];
  if (!sheet) return;
  const canvas = sheet instanceof HTMLCanvasElement ? sheet : null;
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = name + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

initTemplatesheets();
let useSpriteMode = false;

// ===================== BIG CHARACTER (~96px tall) =====================
const CHAR_SCALE = 1.4;

function drawChar(sx, sy, dir, frame, moving, skin, hair, shirt, pants, name, hp, isPlayer, mobType, maxHp, boneSwing, mobScale, castTimer) {
  const effectiveScale = CHAR_SCALE * (mobScale || 1);

  // Try sprite mode first
  if (useSpriteMode) {
    const sheetName = isPlayer ? 'player' : (mobType || 'grunt');
    const spriteScale = effectiveScale * 1.3; // scale sprite layers to match game character size
    if (drawLayeredSprite(sheetName, sx, sy, dir, frame, moving, spriteScale)) {
      const headY = sy - 80 * effectiveScale;
      drawNameTag(sx, sy, headY, name, hp, isPlayer, maxHp);
      return;
    }
  }

  // Legacy canvas drawing
  // Draw hitbox circle at normal scale (before character)
  if (!isPlayer || gameSettings.playerIndicator) {
    ctx.strokeStyle = "#00cc44";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy - 20, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,200,60,0.08)";
    ctx.beginPath();
    ctx.arc(sx, sy - 20, 32, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw character body at scaled size
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(effectiveScale, effectiveScale);
  ctx.translate(-sx, -sy);

  if (isPlayer) drawChoso(sx, sy, dir, frame, moving, name, hp);
  else drawGenericChar(sx, sy, dir, frame, moving, skin, hair, shirt, pants, name, hp, mobType, boneSwing, castTimer);

  ctx.restore();

  // Draw UI (name + hp) at normal scale
  const headY = sy - 68 * effectiveScale; // approximate top of head in scaled space
  drawNameTag(sx, sy, headY, name, hp, isPlayer, maxHp);
}

// === CHOSO-STYLE PLAYER ===
function drawChoso(sx, sy, dir, frame, moving, name, hp) {
  const bobY = moving ? Math.sin(frame * Math.PI / 2) * 2.5 : 0;
  const legSwing = moving ? Math.sin(frame * Math.PI / 2) * 6 : 0;
  const armSwing = moving ? Math.sin(frame * Math.PI / 2) * 5 : 0;
  const x = sx - 20, y = sy - 68;
  const skin = player.skin;
  const black = player.shirt;
  const hairColor = player.hair;
  const pantsColor = player.pants;

  // === LEGS (PANTS — tier-aware) ===
  const pantsTier = (playerEquip.pants && playerEquip.pants.tier) || 0;
  const pFront = (dir === 0 || dir === 1);
  // Leg positions
  const l1x = pFront ? x + 6 : x + 10;
  const l1w = pFront ? 10 : 9;
  const l2x = pFront ? x + 24 : x + 21;
  const l2w = pFront ? 10 : 9;
  const l1y = y + 46 + bobY - legSwing;
  const l2y = y + 46 + bobY + legSwing;
  const lh = 14;

  if (pantsTier === 0) {
    ctx.fillStyle = pantsColor;
    ctx.fillRect(l1x, l1y, l1w, lh);
    ctx.fillRect(l2x, l2y, l2w, lh);
  } else if (pantsTier === 1) {
    // T1 Leather — warm brown with stitch
    const tv = ARMOR_VISUALS[1];
    ctx.fillStyle = tv.primary;
    ctx.fillRect(l1x, l1y, l1w, lh);
    ctx.fillRect(l2x, l2y, l2w, lh);
    ctx.fillStyle = tv.secondary;
    ctx.fillRect(l1x + 2, l1y + 3, l1w - 4, 1);
    ctx.fillRect(l1x + 2, l1y + 7, l1w - 4, 1);
    ctx.fillRect(l1x + 2, l1y + 11, l1w - 4, 1);
    ctx.fillRect(l2x + 2, l2y + 3, l2w - 4, 1);
    ctx.fillRect(l2x + 2, l2y + 7, l2w - 4, 1);
    ctx.fillRect(l2x + 2, l2y + 11, l2w - 4, 1);
  } else if (pantsTier === 2) {
    // T2 Iron/Chain — steel grey-blue chainmail
    const tv = ARMOR_VISUALS[2];
    ctx.fillStyle = tv.primary;
    ctx.fillRect(l1x, l1y, l1w, lh);
    ctx.fillRect(l2x, l2y, l2w, lh);
    ctx.fillStyle = tv.secondary;
    for (let cy2 = 0; cy2 < lh; cy2 += 3) {
      const offset = (cy2 % 6 === 0) ? 0 : 2;
      for (let cx2 = offset; cx2 < l1w - 1; cx2 += 4) {
        ctx.fillRect(l1x + cx2 + 1, l1y + cy2, 1, 1);
        ctx.fillRect(l2x + cx2 + 1, l2y + cy2, 1, 1);
      }
    }
    ctx.fillStyle = tv.dark;
    ctx.fillRect(l1x, l1y, 1, lh); ctx.fillRect(l1x + l1w - 1, l1y, 1, lh);
    ctx.fillRect(l2x, l2y, 1, lh); ctx.fillRect(l2x + l2w - 1, l2y, 1, lh);
  } else if (pantsTier === 3) {
    // T3 Plate/Warden — dark green-grey plate
    const tv = ARMOR_VISUALS[3];
    ctx.fillStyle = tv.primary;
    ctx.fillRect(l1x, l1y, l1w, lh);
    ctx.fillRect(l2x, l2y, l2w, lh);
    ctx.fillStyle = tv.secondary;
    ctx.fillRect(l1x + 1, l1y + 1, l1w - 2, 4);
    ctx.fillRect(l1x + 1, l1y + 7, l1w - 2, 4);
    ctx.fillRect(l2x + 1, l2y + 1, l2w - 2, 4);
    ctx.fillRect(l2x + 1, l2y + 7, l2w - 2, 4);
    // Knee guards
    ctx.fillStyle = tv.highlight;
    ctx.fillRect(l1x - 1, l1y, l1w + 2, 3);
    ctx.fillRect(l2x - 1, l2y, l2w + 2, 3);
    // Subtle ember glow
    const tPulse = tierGlow(3, renderTime);
    const g = tv.glow.color;
    ctx.fillStyle = `rgba(${g[0]},${g[1]},${g[2]},${tPulse})`;
    ctx.fillRect(l1x, l1y + lh - 2, 1, 2); ctx.fillRect(l1x + l1w - 1, l1y + lh - 2, 1, 2);
    ctx.fillRect(l2x, l2y + lh - 2, 1, 2); ctx.fillRect(l2x + l2w - 1, l2y + lh - 2, 1, 2);
  } else if (pantsTier === 4) {
    // T4 Void — black with purple trim
    const tv = ARMOR_VISUALS[4];
    const vGlow = tierGlow(4, renderTime);
    ctx.fillStyle = tv.primary;
    ctx.fillRect(l1x, l1y, l1w, lh);
    ctx.fillRect(l2x, l2y, l2w, lh);
    ctx.fillStyle = tv.secondary;
    ctx.fillRect(l1x + 1, l1y + 1, l1w - 2, 5);
    ctx.fillRect(l1x + 1, l1y + 8, l1w - 2, 5);
    ctx.fillRect(l2x + 1, l2y + 1, l2w - 2, 5);
    ctx.fillRect(l2x + 1, l2y + 8, l2w - 2, 5);
    // Knee guards — dark
    ctx.fillStyle = tv.secondary;
    ctx.fillRect(l1x - 1, l1y - 1, l1w + 2, 4);
    ctx.fillRect(l2x - 1, l2y - 1, l2w + 2, 4);
    // Purple glow edges
    const g = tv.glow.color;
    ctx.fillStyle = `rgba(${g[0]},${g[1]},${g[2]},${vGlow})`;
    ctx.fillRect(l1x, l1y, l1w, 1); ctx.fillRect(l1x, l1y + lh - 1, l1w, 1);
    ctx.fillRect(l2x, l2y, l2w, 1); ctx.fillRect(l2x, l2y + lh - 1, l2w, 1);
    ctx.fillRect(l1x - 1, l1y + 4, 1, 6); ctx.fillRect(l1x + l1w, l1y + 4, 1, 6);
    ctx.fillRect(l2x - 1, l2y + 4, 1, 6); ctx.fillRect(l2x + l2w, l2y + 4, 1, 6);
  }
  // Boots — tier-aware visuals
  const bootTier = (playerEquip.boots && playerEquip.boots.tier) || 0;
  // Boot positions per direction
  const bFront = (dir === 0 || dir === 1);
  const b1x = bFront ? x + 4 : x + 8;
  const b1y = y + 58 + bobY - legSwing * 0.3;
  const b1w = bFront ? 13 : 12;
  const b2x = bFront ? x + 23 : x + 20;
  const b2y = y + 58 + bobY + legSwing * 0.3;
  const b2w = bFront ? 13 : 12;
  const bh = 6;

  if (bootTier === 0) {
    ctx.fillStyle = darkenColor(pantsColor, 0.75);
    ctx.fillRect(b1x, b1y, b1w, bh);
    ctx.fillRect(b2x, b2y, b2w, bh);
  } else if (bootTier === 1) {
    // T1 Leather — warm brown
    const tv = ARMOR_VISUALS[1];
    ctx.fillStyle = tv.dark;
    ctx.fillRect(b1x, b1y, b1w, bh);
    ctx.fillRect(b2x, b2y, b2w, bh);
    ctx.fillStyle = tv.darker;
    ctx.fillRect(b1x, b1y + bh - 2, b1w, 2);
    ctx.fillRect(b2x, b2y + bh - 2, b2w, 2);
    ctx.fillStyle = tv.secondary;
    ctx.fillRect(b1x + 2, b1y + 1, b1w - 4, 1);
    ctx.fillRect(b2x + 2, b2y + 1, b2w - 4, 1);
  } else if (bootTier === 2) {
    // T2 Iron — steel grey-blue
    const tv = ARMOR_VISUALS[2];
    ctx.fillStyle = tv.primary;
    ctx.fillRect(b1x, b1y, b1w, bh);
    ctx.fillRect(b2x, b2y, b2w, bh);
    ctx.fillStyle = tv.dark;
    ctx.fillRect(b1x, b1y + bh - 2, b1w, 2);
    ctx.fillRect(b2x, b2y + bh - 2, b2w, 2);
    // Silver accent stripe
    ctx.fillStyle = tv.bootStripe;
    ctx.fillRect(b1x + 1, b1y + 2, b1w - 2, 1);
    ctx.fillRect(b2x + 1, b2y + 2, b2w - 2, 1);
    // Ankle cuff
    ctx.fillStyle = tv.highlight;
    ctx.fillRect(b1x + 1, b1y - 2, b1w - 2, 2);
    ctx.fillRect(b2x + 1, b2y - 2, b2w - 2, 2);
  } else if (bootTier === 3) {
    // T3 Warden — dark green-grey
    const tv = ARMOR_VISUALS[3];
    ctx.fillStyle = tv.primary;
    ctx.fillRect(b1x, b1y, b1w, bh);
    ctx.fillRect(b2x, b2y, b2w, bh);
    ctx.fillStyle = tv.dark;
    ctx.fillRect(b1x, b1y + bh - 2, b1w, 2);
    ctx.fillRect(b2x, b2y + bh - 2, b2w, 2);
    // Ember glow edges
    const ePulse = tierGlow(3, renderTime, 0.006);
    const g = tv.glow.color;
    ctx.fillStyle = `rgba(${g[0]},${g[1]},${g[2]},${ePulse})`;
    ctx.fillRect(b1x, b1y, 1, bh); ctx.fillRect(b1x + b1w - 1, b1y, 1, bh);
    ctx.fillRect(b2x, b2y, 1, bh); ctx.fillRect(b2x + b2w - 1, b2y, 1, bh);
    // Tall ankle cuff
    ctx.fillStyle = tv.secondary;
    ctx.fillRect(b1x + 1, b1y - 3, b1w - 2, 3);
    ctx.fillRect(b2x + 1, b2y - 3, b2w - 2, 3);
    ctx.fillStyle = tv.highlight;
    ctx.fillRect(b1x + 2, b1y - 2, b1w - 4, 1);
    ctx.fillRect(b2x + 2, b2y - 2, b2w - 4, 1);
  } else if (bootTier === 4) {
    // T4 Void — black with purple glow
    const tv = ARMOR_VISUALS[4];
    const vGlow = tierGlow(4, renderTime, 0.008);
    ctx.fillStyle = tv.primary;
    ctx.fillRect(b1x, b1y, b1w, bh);
    ctx.fillRect(b2x, b2y, b2w, bh);
    ctx.fillStyle = tv.bootSole;
    ctx.fillRect(b1x, b1y + bh - 2, b1w, 2);
    ctx.fillRect(b2x, b2y + bh - 2, b2w, 2);
    // Purple glow border
    const g = tv.glow.color;
    ctx.fillStyle = `rgba(${g[0]},${g[1]},${g[2]},${vGlow})`;
    ctx.fillRect(b1x, b1y, 1, bh); ctx.fillRect(b1x + b1w - 1, b1y, 1, bh);
    ctx.fillRect(b1x, b1y, b1w, 1); ctx.fillRect(b1x, b1y + bh - 1, b1w, 1);
    ctx.fillRect(b2x, b2y, 1, bh); ctx.fillRect(b2x + b2w - 1, b2y, 1, bh);
    ctx.fillRect(b2x, b2y, b2w, 1); ctx.fillRect(b2x, b2y + bh - 1, b2w, 1);
    // Tall ankle cuff — void
    ctx.fillStyle = tv.secondary;
    ctx.fillRect(b1x + 1, b1y - 4, b1w - 2, 4);
    ctx.fillRect(b2x + 1, b2y - 4, b2w - 2, 4);
    // Shimmer
    const shimX = Math.floor(renderTime / 120) % (b1w - 4);
    const s = tv.shimmer;
    ctx.fillStyle = `rgba(${s[0]},${s[1]},${s[2]},${vGlow})`;
    ctx.fillRect(b1x + 2 + shimX, b1y - 3, 2, 1);
    ctx.fillRect(b2x + 2 + shimX, b2y - 3, 2, 1);
  }

  // === BODY (CHEST — tier-aware) ===
  const chestTier = (playerEquip.chest && playerEquip.chest.tier) || 0;
  const bodyX = x + 4, bodyY = y + 28 + bobY, bodyW = 32, bodyH = 20;

  if (chestTier === 0) {
    ctx.fillStyle = black;
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
    ctx.fillStyle = darkenColor(black, 0.8);
    ctx.fillRect(x + 8, y + 33 + bobY, 2, 12);
    ctx.fillRect(x + 28, y + 34 + bobY, 2, 10);
    ctx.fillStyle = lightenColor(black, 0.12);
    ctx.fillRect(x + 12, bodyY, 16, 3);
  } else if (chestTier === 1) {
    // T1 Leather — warm brown vest
    const tv = ARMOR_VISUALS[1];
    ctx.fillStyle = tv.primary;
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
    ctx.fillStyle = tv.secondary;
    for (let cy2 = 0; cy2 < bodyH; cy2 += 4) {
      ctx.fillRect(bodyX + 2, bodyY + cy2, bodyW - 4, 1);
    }
    ctx.fillStyle = tv.belt;
    ctx.fillRect(bodyX, bodyY + bodyH - 2, bodyW, 2);
    ctx.fillStyle = tv.secondary;
    ctx.fillRect(x + 12, bodyY, 16, 3);
  } else if (chestTier === 2) {
    // T2 Iron Plate — steel grey-blue with rivets
    const tv = ARMOR_VISUALS[2];
    ctx.fillStyle = tv.primary;
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
    ctx.fillStyle = tv.highlight;
    ctx.fillRect(bodyX + 2, bodyY + 2, bodyW - 4, 7);
    ctx.fillRect(bodyX + 2, bodyY + 11, bodyW - 4, 7);
    ctx.fillStyle = tv.dark;
    ctx.fillRect(bodyX + bodyW / 2 - 1, bodyY + 2, 2, bodyH - 4);
    // Rivets — silver
    ctx.fillStyle = tv.accent;
    ctx.fillRect(bodyX + 4, bodyY + 3, 2, 2);
    ctx.fillRect(bodyX + bodyW - 6, bodyY + 3, 2, 2);
    ctx.fillRect(bodyX + 4, bodyY + 13, 2, 2);
    ctx.fillRect(bodyX + bodyW - 6, bodyY + 13, 2, 2);
    // Collar
    ctx.fillStyle = tv.highlight;
    ctx.fillRect(x + 10, bodyY - 1, 20, 4);
    // Shoulder pads
    ctx.fillStyle = tv.primary;
    ctx.fillRect(bodyX - 2, bodyY, 4, 6);
    ctx.fillRect(bodyX + bodyW - 2, bodyY, 4, 6);
  } else if (chestTier === 3) {
    // T3 Warden Plate — dark green-grey with ember core
    const tv = ARMOR_VISUALS[3];
    ctx.fillStyle = tv.primary;
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
    ctx.fillStyle = tv.secondary;
    for (let row = 0; row < 4; row++) {
      const off = (row % 2 === 0) ? 0 : 5;
      for (let col = off; col < bodyW - 2; col += 10) {
        ctx.beginPath();
        ctx.arc(bodyX + col + 5, bodyY + 3 + row * 5, 4, 0, Math.PI);
        ctx.fill();
      }
    }
    // Ember emblem center
    const emPulse = tierGlow(3, renderTime, 0.004);
    const g = tv.glow.color;
    ctx.fillStyle = tv.emberEmblem;
    ctx.fillRect(bodyX + bodyW / 2 - 2, bodyY + 7, 4, 4);
    ctx.fillStyle = `rgba(${g[0]},${g[1]},${g[2]},${emPulse + 0.2})`;
    ctx.fillRect(bodyX + bodyW / 2 - 1, bodyY + 8, 2, 2);
    // Shoulder pads
    ctx.fillStyle = tv.dark;
    ctx.fillRect(bodyX - 3, bodyY - 1, 5, 8);
    ctx.fillRect(bodyX + bodyW - 2, bodyY - 1, 5, 8);
    ctx.fillStyle = tv.secondary;
    ctx.fillRect(x + 10, bodyY - 1, 20, 3);
  } else if (chestTier === 4) {
    // T4 Void — black plate with purple glow
    const tv = ARMOR_VISUALS[4];
    const vGlow = tierGlow(4, renderTime, 0.005);
    ctx.fillStyle = tv.primary;
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
    ctx.fillStyle = tv.secondary;
    ctx.fillRect(bodyX + 2, bodyY + 2, bodyW - 4, 7);
    ctx.fillRect(bodyX + 2, bodyY + 11, bodyW - 4, 7);
    // Purple trim borders
    const g = tv.glow.color;
    ctx.fillStyle = `rgba(${g[0]},${g[1]},${g[2]},${vGlow})`;
    ctx.fillRect(bodyX, bodyY, bodyW, 1);
    ctx.fillRect(bodyX, bodyY + bodyH - 1, bodyW, 1);
    ctx.fillRect(bodyX, bodyY, 1, bodyH);
    ctx.fillRect(bodyX + bodyW - 1, bodyY, 1, bodyH);
    // Void core emblem
    ctx.fillStyle = tv.voidCore;
    ctx.fillRect(bodyX + bodyW / 2 - 1, bodyY + 5, 2, 10);
    ctx.fillRect(bodyX + bodyW / 2 - 4, bodyY + 9, 8, 2);
    const cg = tv.coreGlow;
    ctx.fillStyle = `rgba(${cg[0]},${cg[1]},${cg[2]},${vGlow * 0.6})`;
    ctx.beginPath(); ctx.arc(bodyX + bodyW / 2, bodyY + 10, 5, 0, Math.PI * 2); ctx.fill();
    // Shoulder pads — black with purple edge
    ctx.fillStyle = tv.primary;
    ctx.fillRect(bodyX - 3, bodyY - 2, 6, 9);
    ctx.fillRect(bodyX + bodyW - 3, bodyY - 2, 6, 9);
    ctx.fillStyle = `rgba(${g[0]},${g[1]},${g[2]},${vGlow * 0.5})`;
    ctx.fillRect(bodyX - 3, bodyY - 2, 6, 1);
    ctx.fillRect(bodyX + bodyW - 3, bodyY - 2, 6, 1);
    // Collar
    ctx.fillStyle = tv.secondary;
    ctx.fillRect(x + 10, bodyY - 2, 20, 4);
  }

  // === ARMS + GUN (consistent left-hand rifle) ===
  // The gun arm is always on the LEFT side of the character body.
  // For all directions, the arm+gun attaches at the same body-relative point.
  // Rifle: stock -> body -> barrel -> muzzle, total ~50px long

  // ---- IRONWOOD BOW RENDERING ----
  const drawBow = (rx, ry, pointDir) => {
    const wood = "#6a4a2a";
    const woodD = "#4a3018";
    const string = "#c8b888";
    const bowLen = 40;
    const grip = "#3a2a18";

    if (pointDir === 2) { // LEFT
      // Bow stave (curved left)
      ctx.strokeStyle = wood; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rx - 4, ry - bowLen / 2);
      ctx.quadraticCurveTo(rx - 20, ry, rx - 4, ry + bowLen / 2);
      ctx.stroke();
      // String
      ctx.strokeStyle = string; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx - 4, ry - bowLen / 2);
      ctx.lineTo(rx - 4, ry + bowLen / 2);
      ctx.stroke();
      // Grip wrap
      ctx.fillStyle = grip; ctx.fillRect(rx - 8, ry - 3, 5, 6);
      // Arrow nocked
      ctx.fillStyle = woodD; ctx.fillRect(rx - 4 - 30, ry - 1, 30, 2);
      // Green fletching
      ctx.fillStyle = "#4a8a3a"; ctx.fillRect(rx - 4 - 4, ry - 3, 6, 2); ctx.fillRect(rx - 4 - 4, ry + 1, 6, 2);
      // Arrowhead
      ctx.fillStyle = "#888"; ctx.beginPath(); ctx.moveTo(rx - 34, ry - 3); ctx.lineTo(rx - 40, ry); ctx.lineTo(rx - 34, ry + 3); ctx.fill();
    } else if (pointDir === 3) { // RIGHT
      ctx.strokeStyle = wood; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rx + 4, ry - bowLen / 2);
      ctx.quadraticCurveTo(rx + 20, ry, rx + 4, ry + bowLen / 2);
      ctx.stroke();
      ctx.strokeStyle = string; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx + 4, ry - bowLen / 2);
      ctx.lineTo(rx + 4, ry + bowLen / 2);
      ctx.stroke();
      ctx.fillStyle = grip; ctx.fillRect(rx + 3, ry - 3, 5, 6);
      ctx.fillStyle = woodD; ctx.fillRect(rx + 4, ry - 1, 30, 2);
      ctx.fillStyle = "#4a8a3a"; ctx.fillRect(rx + 4 - 2, ry - 3, 6, 2); ctx.fillRect(rx + 4 - 2, ry + 1, 6, 2);
      ctx.fillStyle = "#888"; ctx.beginPath(); ctx.moveTo(rx + 34, ry - 3); ctx.lineTo(rx + 40, ry); ctx.lineTo(rx + 34, ry + 3); ctx.fill();
    } else if (pointDir === 0) { // DOWN
      ctx.strokeStyle = wood; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rx - bowLen / 2, ry - 4);
      ctx.quadraticCurveTo(rx, ry + 16, rx + bowLen / 2, ry - 4);
      ctx.stroke();
      ctx.strokeStyle = string; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx - bowLen / 2, ry - 4);
      ctx.lineTo(rx + bowLen / 2, ry - 4);
      ctx.stroke();
      ctx.fillStyle = grip; ctx.fillRect(rx - 3, ry - 2, 6, 5);
      ctx.fillStyle = woodD; ctx.fillRect(rx - 1, ry - 4, 2, 30);
      ctx.fillStyle = "#4a8a3a"; ctx.fillRect(rx - 3, ry - 4 - 2, 2, 6); ctx.fillRect(rx + 1, ry - 4 - 2, 2, 6);
      ctx.fillStyle = "#888"; ctx.beginPath(); ctx.moveTo(rx - 3, ry + 26); ctx.lineTo(rx, ry + 32); ctx.lineTo(rx + 3, ry + 26); ctx.fill();
    } else { // UP
      ctx.strokeStyle = wood; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(rx - bowLen / 2, ry + 4);
      ctx.quadraticCurveTo(rx, ry - 16, rx + bowLen / 2, ry + 4);
      ctx.stroke();
      ctx.strokeStyle = string; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx - bowLen / 2, ry + 4);
      ctx.lineTo(rx + bowLen / 2, ry + 4);
      ctx.stroke();
      ctx.fillStyle = grip; ctx.fillRect(rx - 3, ry - 3, 6, 5);
      ctx.fillStyle = woodD; ctx.fillRect(rx - 1, ry + 4 - 30, 2, 30);
      ctx.fillStyle = "#4a8a3a"; ctx.fillRect(rx - 3, ry + 4 - 4, 2, 6); ctx.fillRect(rx + 1, ry + 4 - 4, 2, 6);
      ctx.fillStyle = "#888"; ctx.beginPath(); ctx.moveTo(rx - 3, ry - 26); ctx.lineTo(rx, ry - 32); ctx.lineTo(rx + 3, ry - 26); ctx.fill();
    }
  };

  const drawRifle = (rx, ry, pointDir) => {
    // Pick colors/proportions based on equipped gun (drawChoso is player-only)
    const eq = playerEquip.gun;
    const gunId = eq ? eq.id : 'recruit';

    // Gun visual configs: { metal, metalL, stock, barrel length, compact }
    const configs = {
      recruit:        { metal: "#2e2e32", metalL: "#3a3a40", stock: "#2a2218", stockL: "#3a3228", mag: "#282828", accent: "#444", muzzle: "#1a1a1a", barrelLen: 42, handguardLen: 22, compact: false },
      smg:            { metal: "#3a4a3a", metalL: "#4a5a4a", stock: "#2a3a2a", stockL: "#3a4a3a", mag: "#2a3a2a", accent: "#5a7a5a", muzzle: "#2a3a2a", barrelLen: 24, handguardLen: 14, compact: true },
      rifle:          { metal: "#4a3040", metalL: "#5a4050", stock: "#3a2030", stockL: "#4a3040", mag: "#3a2030", accent: "#7a5a6a", muzzle: "#2a1a2a", barrelLen: 48, handguardLen: 24, compact: false },
      frost_rifle:    { metal: "#2a4a5a", metalL: "#3a5a6a", stock: "#1a3a4a", stockL: "#2a4a5a", mag: "#1a3a4a", accent: "#5a8aaa", muzzle: "#1a3a4a", barrelLen: 44, handguardLen: 22, compact: false },
      inferno_cannon: { metal: "#4a2a1a", metalL: "#5a3a2a", stock: "#3a1a0a", stockL: "#4a2a1a", mag: "#3a1a0a", accent: "#8a4a2a", muzzle: "#2a1a0a", barrelLen: 50, handguardLen: 26, compact: false },
      // === MAIN GUNS ===
      storm_ar:       { metal: "#2a4a6a", metalL: "#3a5a7a", stock: "#1a3a5a", stockL: "#2a4a6a", mag: "#1a3a5a", accent: "#5a8acc", muzzle: "#1a3050", barrelLen: 40, handguardLen: 20, compact: false },
      heavy_ar:       { metal: "#3a3030", metalL: "#4a4040", stock: "#2a2020", stockL: "#3a3030", mag: "#2a1a1a", accent: "#6a4a3a", muzzle: "#1a1010", barrelLen: 48, handguardLen: 26, compact: false },
      boomstick:      { metal: "#5a4a30", metalL: "#6a5a40", stock: "#3a2a18", stockL: "#4a3a28", mag: "#3a2a18", accent: "#8a7a50", muzzle: "#2a2010", barrelLen: 22, handguardLen: 12, compact: false },
      volt_9:         { metal: "#3a2a5a", metalL: "#4a3a6a", stock: "#2a1a4a", stockL: "#3a2a5a", mag: "#2a1a4a", accent: "#6a5a8a", muzzle: "#1a1030", barrelLen: 22, handguardLen: 12, compact: true },
    };

    // Ironwood Bow: special rendering instead of rifle
    if (gunId === 'ironwood_bow') {
      drawBow(rx, ry, pointDir);
      return;
    }

    const c = configs[gunId] || configs.recruit;

    // Draw based on direction (simplified template using config)
    const metalD = "#1e1e22";
    const grip = "#222";

    if (pointDir === 2) { // LEFT
      ctx.fillStyle = c.stock; ctx.fillRect(rx + 6, ry - 4, c.compact ? 8 : 12, 8);
      ctx.fillStyle = c.stockL; ctx.fillRect(rx + 7, ry - 3, c.compact ? 6 : 10, 6);
      ctx.fillStyle = c.metalL; ctx.fillRect(rx - 8, ry - 5, 16, 10);
      ctx.fillStyle = c.accent; ctx.fillRect(rx - 6, ry - 4, 12, 1);
      if (!c.compact) { ctx.fillStyle = grip; ctx.fillRect(rx + 2, ry + 5, 5, 10); }
      ctx.fillStyle = c.mag; ctx.fillRect(rx - 4, ry + 5, 5, c.compact ? 8 : 14);
      ctx.fillStyle = c.metalL; ctx.fillRect(rx - 8 - c.handguardLen, ry - 4, c.handguardLen, 9);
      ctx.fillStyle = c.metal; ctx.fillRect(rx - 8 - c.barrelLen, ry - 2, c.barrelLen - c.handguardLen, 5);
      ctx.fillStyle = c.muzzle; ctx.fillRect(rx - 8 - c.barrelLen - 6, ry - 4, 6, 9);
      // SMG has suppressor look
      if (gunId === 'smg') { ctx.fillStyle = "#3a4a3a"; ctx.fillRect(rx - 8 - c.barrelLen - 10, ry - 3, 10, 7); }
      // Rifle has front grip
      if (gunId === 'rifle') { ctx.fillStyle = "#3a2030"; ctx.fillRect(rx - 20, ry + 5, 4, 8); }
      // Frost rifle has glowing barrel tip
      if (gunId === 'frost_rifle') { ctx.fillStyle = "rgba(100,200,255,0.5)"; ctx.beginPath(); ctx.arc(rx - 8 - c.barrelLen - 3, ry, 5, 0, Math.PI * 2); ctx.fill(); }
      // Inferno cannon has wide muzzle + glow
      if (gunId === 'inferno_cannon') { ctx.fillStyle = "#5a2a0a"; ctx.fillRect(rx - 8 - c.barrelLen - 8, ry - 5, 8, 11); ctx.fillStyle = "rgba(255,100,20,0.4)"; ctx.beginPath(); ctx.arc(rx - 8 - c.barrelLen - 4, ry, 6, 0, Math.PI * 2); ctx.fill(); }
    } else if (pointDir === 3) { // RIGHT
      ctx.fillStyle = c.stock; ctx.fillRect(rx - (c.compact ? 14 : 18), ry - 4, c.compact ? 8 : 12, 8);
      ctx.fillStyle = c.metalL; ctx.fillRect(rx - 8, ry - 5, 16, 10);
      ctx.fillStyle = c.accent; ctx.fillRect(rx - 6, ry - 4, 12, 1);
      if (!c.compact) { ctx.fillStyle = grip; ctx.fillRect(rx - 7, ry + 5, 5, 10); }
      ctx.fillStyle = c.mag; ctx.fillRect(rx - 1, ry + 5, 5, c.compact ? 8 : 14);
      ctx.fillStyle = c.metalL; ctx.fillRect(rx + 8, ry - 4, c.handguardLen, 9);
      ctx.fillStyle = c.metal; ctx.fillRect(rx + 8 + c.handguardLen, ry - 2, c.barrelLen - c.handguardLen, 5);
      ctx.fillStyle = c.muzzle; ctx.fillRect(rx + 8 + c.barrelLen, ry - 4, 6, 9);
      if (gunId === 'smg') { ctx.fillStyle = "#3a4a3a"; ctx.fillRect(rx + 8 + c.barrelLen, ry - 3, 10, 7); }
      if (gunId === 'rifle') { ctx.fillStyle = "#3a2030"; ctx.fillRect(rx + 16, ry + 5, 4, 8); }
      if (gunId === 'frost_rifle') { ctx.fillStyle = "rgba(100,200,255,0.5)"; ctx.beginPath(); ctx.arc(rx + 8 + c.barrelLen + 3, ry, 5, 0, Math.PI * 2); ctx.fill(); }
      if (gunId === 'inferno_cannon') { ctx.fillStyle = "#5a2a0a"; ctx.fillRect(rx + 8 + c.barrelLen, ry - 5, 8, 11); ctx.fillStyle = "rgba(255,100,20,0.4)"; ctx.beginPath(); ctx.arc(rx + 8 + c.barrelLen + 4, ry, 6, 0, Math.PI * 2); ctx.fill(); }
    } else if (pointDir === 0) { // DOWN
      ctx.fillStyle = c.stock; ctx.fillRect(rx - 4, ry - (c.compact ? 14 : 18), 8, c.compact ? 8 : 12);
      ctx.fillStyle = c.metalL; ctx.fillRect(rx - 5, ry - 8, 10, 16);
      ctx.fillStyle = c.mag; ctx.fillRect(rx + 5, ry - 1, c.compact ? 8 : 14, 5);
      ctx.fillStyle = c.metalL; ctx.fillRect(rx - 4, ry + 8, 9, c.handguardLen);
      ctx.fillStyle = c.metal; ctx.fillRect(rx - 2, ry + 8 + c.handguardLen, 5, c.barrelLen - c.handguardLen);
      ctx.fillStyle = c.muzzle; ctx.fillRect(rx - 4, ry + 8 + c.barrelLen, 9, 6);
    } else { // UP
      ctx.fillStyle = c.stock; ctx.fillRect(rx - 4, ry + 6, 8, c.compact ? 8 : 12);
      ctx.fillStyle = c.metalL; ctx.fillRect(rx - 5, ry - 8, 10, 16);
      ctx.fillStyle = c.mag; ctx.fillRect(rx + 5, ry - 4, c.compact ? 8 : 14, 5);
      ctx.fillStyle = c.metalL; ctx.fillRect(rx - 4, ry - 8 - c.handguardLen, 9, c.handguardLen);
      ctx.fillStyle = c.metal; ctx.fillRect(rx - 2, ry - 8 - c.barrelLen, 5, c.barrelLen - c.handguardLen);
      ctx.fillStyle = c.muzzle; ctx.fillRect(rx - 4, ry - 8 - c.barrelLen - 6, 9, 6);
    }
  };
  // Consistent anchor: gun arm at left side of body, mid-torso height
  const armY = y + 35 + bobY; // consistent Y for gun hand
  const bodyL = x + 2;  // left edge of body
  const bodyR = x + 36; // right edge of body
  const bodyC = x + 20; // center X (= sx)

  // Draw free arm (no gun)
  const drawFreeArm = (ax, ay) => {
    ctx.fillStyle = black; ctx.fillRect(ax, ay, 7, 16);
    ctx.fillStyle = skin; ctx.fillRect(ax + 1, ay + 15, 6, 5);
    // Ninja dual katanas — second black katana in free hand
    if (activeSlot === 1 && melee.special === 'ninja') {
      const handX = ax + 3, handY = ay + 17;
      // During swing — animate off-hand katana in opposite direction
      if (melee.swinging) {
        const progress = 1 - (melee.swingTimer / melee.swingDuration);
        const swingAngle = -(progress - 0.5) * 2.2; // opposite direction swing
        ctx.save();
        ctx.translate(handX, handY);
        ctx.rotate(swingAngle);
        ctx.translate(-handX, -handY);
      }
      if (dir === 2) { // facing LEFT — blade points left
        ctx.fillStyle = "#333"; ctx.fillRect(handX - 1, handY - 3, 2, 5);
        ctx.fillStyle = "#1a1a2a"; ctx.fillRect(handX - 24, handY - 1, 23, 3);
        ctx.fillStyle = "#0a0a15"; ctx.fillRect(handX - 24, handY + 1, 23, 1);
        ctx.fillStyle = "#1a1a2a"; ctx.beginPath(); ctx.moveTo(handX - 24, handY - 1); ctx.lineTo(handX - 29, handY + 0.5); ctx.lineTo(handX - 24, handY + 2); ctx.fill();
      } else if (dir === 3) { // facing RIGHT
        ctx.fillStyle = "#333"; ctx.fillRect(handX - 1, handY - 3, 2, 5);
        ctx.fillStyle = "#1a1a2a"; ctx.fillRect(handX + 1, handY - 1, 23, 3);
        ctx.fillStyle = "#0a0a15"; ctx.fillRect(handX + 1, handY + 1, 23, 1);
        ctx.fillStyle = "#1a1a2a"; ctx.beginPath(); ctx.moveTo(handX + 24, handY - 1); ctx.lineTo(handX + 29, handY + 0.5); ctx.lineTo(handX + 24, handY + 2); ctx.fill();
      } else if (dir === 0) { // facing DOWN
        ctx.fillStyle = "#333"; ctx.fillRect(handX - 3, handY - 1, 5, 2);
        ctx.fillStyle = "#1a1a2a"; ctx.fillRect(handX - 1, handY + 1, 3, 23);
        ctx.fillStyle = "#0a0a15"; ctx.fillRect(handX + 1, handY + 1, 1, 23);
        ctx.fillStyle = "#1a1a2a"; ctx.beginPath(); ctx.moveTo(handX - 1, handY + 24); ctx.lineTo(handX + 0.5, handY + 29); ctx.lineTo(handX + 2, handY + 24); ctx.fill();
      } else { // facing UP
        ctx.fillStyle = "#333"; ctx.fillRect(handX - 3, handY - 1, 5, 2);
        ctx.fillStyle = "#1a1a2a"; ctx.fillRect(handX - 1, handY - 24, 3, 23);
        ctx.fillStyle = "#0a0a15"; ctx.fillRect(handX + 1, handY - 24, 1, 23);
        ctx.fillStyle = "#1a1a2a"; ctx.beginPath(); ctx.moveTo(handX - 1, handY - 24); ctx.lineTo(handX + 0.5, handY - 29); ctx.lineTo(handX + 2, handY - 24); ctx.fill();
      }
      if (melee.swinging) {
        // Slash trail for off-hand
        const progress = 1 - (melee.swingTimer / melee.swingDuration);
        const alpha = 0.5 * (1 - progress);
        ctx.strokeStyle = `rgba(140,100,200,${alpha})`;
        ctx.lineWidth = 1.5;
        if (dir === 2) { ctx.beginPath(); ctx.moveTo(handX - 8, handY + 10); ctx.lineTo(handX - 28, handY - 8); ctx.stroke(); }
        else if (dir === 3) { ctx.beginPath(); ctx.moveTo(handX + 8, handY + 10); ctx.lineTo(handX + 28, handY - 8); ctx.stroke(); }
        else if (dir === 0) { ctx.beginPath(); ctx.moveTo(handX + 10, handY + 8); ctx.lineTo(handX - 8, handY + 28); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(handX + 10, handY - 8); ctx.lineTo(handX - 8, handY - 28); ctx.stroke(); }
        ctx.restore();
      }
    }
  };

  // Draw gun arm (short stub + hand + weapon with animations)
  const drawGunArm = (hx, hy, rifleX, rifleY, rifleDir) => {
    ctx.fillStyle = skin; ctx.fillRect(hx, hy, 5, 5);
    if (activeSlot === 1) {
      // Katana slash animation — rotate blade during swing
      if (melee.swinging) {
        const progress = 1 - (melee.swingTimer / melee.swingDuration);
        const swingAngle = (progress - 0.5) * 2.2; // -1.1 to 1.1 radians swing arc
        ctx.save();
        ctx.translate(rifleX, rifleY);
        ctx.rotate(swingAngle);
        ctx.translate(-rifleX, -rifleY);
        drawKatanaBlade(rifleX, rifleY, rifleDir);
        // Slash trail
        const alpha = 0.6 * (1 - progress);
        ctx.strokeStyle = `rgba(200,220,255,${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (rifleDir === 2) { ctx.moveTo(rifleX - 10, rifleY - 12); ctx.lineTo(rifleX - 35, rifleY + 8); }
        else if (rifleDir === 3) { ctx.moveTo(rifleX + 10, rifleY - 12); ctx.lineTo(rifleX + 35, rifleY + 8); }
        else if (rifleDir === 0) { ctx.moveTo(rifleX - 12, rifleY + 10); ctx.lineTo(rifleX + 8, rifleY + 35); }
        else { ctx.moveTo(rifleX - 12, rifleY - 10); ctx.lineTo(rifleX + 8, rifleY - 35); }
        ctx.stroke();
        ctx.restore();
      } else if (window._miningActive) {
        // Mining animation — raise-up-then-strike-down pickaxe swing
        const swingAngle = window._miningSwingAngle || 0;
        const hitSpike = (window._miningHitFlash > 0) ? -0.12 : 0; // downward jolt on hit
        const isStriking = (window._miningSwingDir === -1);
        // Direction-aware rotation: rotate around the hand position
        // LEFT/RIGHT: rotate around Y axis (swing overhead arc)
        // DOWN: rotate toward screen (foreshortened, pickaxe tips toward viewer)
        // UP: rotate away from screen (pickaxe goes up and over)
        let rotAngle = 0;
        let pivotX = rifleX, pivotY = rifleY;
        let offsetX = 0, offsetY = 0;
        if (rifleDir === 2) { // LEFT — swing raises pickaxe up, strike brings it down-left
          rotAngle = -swingAngle + hitSpike; // negative = counter-clockwise = raise up
          offsetY = -swingAngle * 8; // lift the whole arm up during wind-up
        } else if (rifleDir === 3) { // RIGHT — mirror of left
          rotAngle = swingAngle - hitSpike; // positive = clockwise = raise up (mirrored)
          offsetY = -swingAngle * 8;
        } else if (rifleDir === 0) { // DOWN — swing forward (toward camera)
          rotAngle = swingAngle * 0.5 + hitSpike; // smaller rotation, more vertical lift
          offsetY = -swingAngle * 12; // significant upward lift during wind-up
          offsetX = (Math.sin(swingAngle * 3) * 2); // slight lateral wobble
        } else { // UP — swing away from camera
          rotAngle = -swingAngle * 0.5 - hitSpike;
          offsetY = swingAngle * 10; // lift handle down (behind head)
          offsetX = (Math.sin(swingAngle * 3) * 2);
        }
        ctx.save();
        ctx.translate(pivotX + offsetX, pivotY + offsetY);
        ctx.rotate(rotAngle);
        ctx.translate(-(pivotX + offsetX), -(pivotY + offsetY));
        drawKatanaBlade(rifleX + offsetX, rifleY + offsetY, rifleDir);
        // Rock debris particles on hit impact
        if (window._miningHitFlash > 0) {
          const sparkA = window._miningHitFlash / 4;
          // More particles, bigger, in strike direction
          ctx.fillStyle = `rgba(160,140,100,${sparkA * 0.8})`;
          for (let i = 0; i < 5; i++) {
            const spread = 24;
            let sx = rifleX + (Math.random() - 0.5) * spread;
            let sy = rifleY + (Math.random() - 0.5) * spread;
            // Bias particles toward the strike direction
            if (rifleDir === 2) sx -= Math.random() * 12;
            else if (rifleDir === 3) sx += Math.random() * 12;
            else if (rifleDir === 0) sy += Math.random() * 12;
            else sy -= Math.random() * 12;
            const sz = 1.5 + Math.random() * 2;
            ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI * 2); ctx.fill();
          }
          // Small bright sparks
          ctx.fillStyle = `rgba(255,240,180,${sparkA * 0.6})`;
          for (let i = 0; i < 2; i++) {
            const sx = rifleX + (Math.random() - 0.5) * 16;
            const sy = rifleY + (Math.random() - 0.5) * 12;
            ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.restore();
      } else {
        // Idle katana with gentle bob
        const idleBob = Math.sin(renderTime / 400) * 1.5;
        drawKatanaBlade(rifleX, rifleY + idleBob, rifleDir);
      }
    } else {
      // Gun with recoil kick + muzzle flash
      const recoil = gun.recoilTimer > 0 ? gun.recoilTimer * 1.5 : 0;
      let rx = rifleX, ry = rifleY;
      if (rifleDir === 0) ry -= recoil;
      else if (rifleDir === 1) ry += recoil;
      else if (rifleDir === 2) rx += recoil;
      else rx -= recoil;
      drawRifle(rx, ry, rifleDir);

      // Muzzle flash
      if (gun.recoilTimer > 3) {
        const fs = gun.recoilTimer * 1.5;
        let fx = rx, fy = ry;
        if (rifleDir === 2) fx -= 49;
        else if (rifleDir === 3) fx += 49;
        else if (rifleDir === 0) fy += 49;
        else fy -= 49;
        ctx.fillStyle = "#ffe040";
        ctx.beginPath(); ctx.arc(fx, fy, fs, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(fx, fy, fs * 0.4, 0, Math.PI * 2); ctx.fill();
      }
    }
  };

  // Katana blade held in hand
  const drawKatanaBlade = (rx, ry, pointDir) => {
    const eq = playerEquip.melee;
    const meleeId = eq ? eq.id : 'knife';

    // Color configs per weapon
    const configs = {
      knife:       { blade: "#b0b0b8", bladeD: "#808088", handle: "#5a4a30", handleD: "#3a3020", guard: "#777", bladeLen: 16, tipLen: 4 },
      katana:      { blade: "#c0ccee", bladeD: "#8898bb", handle: "#5a4020", handleD: "#3a2810", guard: "#aaa", bladeLen: 32, tipLen: 6 },
      dagger:      { blade: "#cccccc", bladeD: "#999", handle: "#6a4a2a", handleD: "#4a3218", guard: "#888", bladeLen: 18, tipLen: 4 },
      mace:        { blade: "#6a5a3a", bladeD: "#5a4a2a", handle: "#5a4a30", handleD: "#4a3a20", guard: "#777", bladeLen: 24, tipLen: 0, isMace: true },
      karambit:    { blade: "#cc3344", bladeD: "#992233", handle: "#222", handleD: "#111", guard: "#444", bladeLen: 22, tipLen: 4, curved: true },
      sword:       { blade: "#c8d0e8", bladeD: "#8898bb", handle: "#5a3818", handleD: "#3a2810", guard: "#c0a860", bladeLen: 30, tipLen: 6, isSword: true },
      battle_axe:  { blade: "#a0a0a8", bladeD: "#707078", handle: "#6a4820", handleD: "#4a3010", guard: "#8a7a50", bladeLen: 28, tipLen: 0, isAxe: true },
      ninja_katanas: { blade: "#1a1a2a", bladeD: "#0a0a15", handle: "#222", handleD: "#111", guard: "#333", bladeLen: 28, tipLen: 5, isNinja: true },
      storm_blade: { blade: "#e8f0ff", bladeD: "#c0d8f0", handle: "#b0c0d0", handleD: "#90a8c0", guard: "#d8e8ff", bladeLen: 34, tipLen: 7, isStorm: true },
      war_cleaver: { blade: "#1a0808", bladeD: "#0a0000", handle: "#2a0808", handleD: "#180505", guard: "#801010", bladeLen: 40, tipLen: 6, isCleaver: true },
      pickaxe:     { blade: "#8a9aaa", bladeD: "#5a6878", handle: "#9a7040", handleD: "#6a4420", guard: "#5a4a30", bladeLen: 28, tipLen: 0, isPickaxe: true },
      spatula:     { blade: "#d0d0d8", bladeD: "#a0a0a8", handle: "#4a3a20", handleD: "#3a2a10", guard: "#808080", bladeLen: 24, tipLen: 0, isSpatula: true },
      // Fishing rods
      bronze_rod:  { blade: "#8a6a3a", bladeD: "#6a4a1a", handle: "#6a4a20", handleD: "#4a3010", guard: "#5a5a5a", bladeLen: 32, tipLen: 0, isFishingRod: true },
      iron_rod:    { blade: "#8a8a9a", bladeD: "#5a5a6a", handle: "#5a4a20", handleD: "#3a2a10", guard: "#666",    bladeLen: 34, tipLen: 0, isFishingRod: true },
      gold_rod:    { blade: "#d4a030", bladeD: "#a07820", handle: "#8a6a30", handleD: "#5a4010", guard: "#c0a040", bladeLen: 36, tipLen: 0, isFishingRod: true },
      mythic_rod:  { blade: "#9070c0", bladeD: "#6850a0", handle: "#4a3a6a", handleD: "#2a1a4a", guard: "#b090d0", bladeLen: 38, tipLen: 0, isFishingRod: true },
      // Farming hoes
      bronze_hoe:  { blade: "#8a6a3a", bladeD: "#6a4a1a", handle: "#6a4a20", handleD: "#4a3010", guard: "#5a5a5a", bladeLen: 26, tipLen: 0, isFarmingHoe: true },
      iron_hoe:    { blade: "#8a8a9a", bladeD: "#5a5a6a", handle: "#5a4a20", handleD: "#3a2a10", guard: "#666",    bladeLen: 28, tipLen: 0, isFarmingHoe: true },
      gold_hoe:    { blade: "#d4a030", bladeD: "#a07820", handle: "#8a6a30", handleD: "#5a4010", guard: "#c0a040", bladeLen: 30, tipLen: 0, isFarmingHoe: true },
      mythic_hoe:  { blade: "#9070c0", bladeD: "#6850a0", handle: "#4a3a6a", handleD: "#2a1a4a", guard: "#b090d0", bladeLen: 32, tipLen: 0, isFarmingHoe: true },
    };
    const c = configs[meleeId] || configs.knife;

    if (pointDir === 2) { // LEFT
      ctx.fillStyle = c.handle; ctx.fillRect(rx + 2, ry - 2, 10, 5);
      ctx.fillStyle = c.handleD; ctx.fillRect(rx + 3, ry - 1, 8, 3);
      ctx.fillStyle = c.guard; ctx.fillRect(rx, ry - 4, 3, 9);
      if (c.isMace) {
        ctx.fillStyle = c.blade; ctx.fillRect(rx - c.bladeLen, ry - 2, c.bladeLen, 4);
        ctx.fillStyle = "#888"; ctx.beginPath(); ctx.arc(rx - c.bladeLen - 4, ry, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#aaa"; for (let s = 0; s < 4; s++) { const a = s * Math.PI / 2; ctx.beginPath(); ctx.arc(rx - c.bladeLen - 4 + Math.cos(a) * 6, ry + Math.sin(a) * 6, 2, 0, Math.PI * 2); ctx.fill(); }
      } else if (c.isSword) {
        // Proper sword — tapered blade with fuller groove, gold pommel
        const bL = c.bladeLen;
        // Gold pommel at end of handle
        ctx.fillStyle = "#c0a040"; ctx.beginPath(); ctx.arc(rx + 12, ry, 3, 0, Math.PI * 2); ctx.fill();
        // Blade — tapers from 5px wide to 2px at tip
        ctx.fillStyle = c.blade;
        ctx.beginPath(); ctx.moveTo(rx, ry - 3); ctx.lineTo(rx - bL + 4, ry - 1); ctx.lineTo(rx - bL - c.tipLen, ry); ctx.lineTo(rx - bL + 4, ry + 1); ctx.lineTo(rx, ry + 3); ctx.closePath(); ctx.fill();
        // Fuller groove (dark line down center)
        ctx.fillStyle = "#7888aa"; ctx.fillRect(rx - bL + 6, ry - 0.5, bL - 12, 1);
        // Edge highlight top
        ctx.fillStyle = "#dde4f0"; ctx.fillRect(rx - bL + 4, ry - 3, bL - 4, 1);
      } else if (c.isAxe) {
        ctx.fillStyle = c.handle; ctx.fillRect(rx - c.bladeLen + 8, ry - 1, c.bladeLen - 8, 3);
        ctx.fillStyle = c.blade; ctx.beginPath(); ctx.moveTo(rx - c.bladeLen + 8, ry - 2); ctx.lineTo(rx - c.bladeLen, ry - 7); ctx.lineTo(rx - c.bladeLen - 4, ry); ctx.lineTo(rx - c.bladeLen, ry + 7); ctx.lineTo(rx - c.bladeLen + 8, ry + 2); ctx.fill();
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx - c.bladeLen, ry + 3, 8, 2);
      } else if (c.isNinja) {
        // Black katana — sleek dark blade
        const bL = c.bladeLen;
        ctx.fillStyle = "#1a1a1a"; ctx.fillRect(rx + 2, ry - 1, 8, 3); // dark handle wrap
        ctx.fillStyle = "#333"; ctx.fillRect(rx, ry - 3, 2, 6); // small guard
        ctx.fillStyle = c.blade; ctx.fillRect(rx - bL, ry - 1.5, bL, 3); // dark blade
        ctx.fillStyle = "#2a2a3a"; ctx.fillRect(rx - bL, ry - 1.5, bL, 1); // top edge highlight
        ctx.fillStyle = c.blade; ctx.beginPath(); ctx.moveTo(rx - bL, ry - 1.5); ctx.lineTo(rx - bL - c.tipLen, ry); ctx.lineTo(rx - bL, ry + 1.5); ctx.fill(); // tip
        // Subtle dark purple edge gleam
        ctx.fillStyle = "rgba(80,50,120,0.3)"; ctx.fillRect(rx - bL + 2, ry - 2, bL - 4, 1);
      } else if (c.isStorm) {
        const bL = c.bladeLen;
        // Light handle
        ctx.fillStyle = c.handle; ctx.fillRect(rx + 2, ry - 2, 10, 4);
        // Diamond guard — gem shape
        ctx.fillStyle = "#d0e0ff"; ctx.beginPath(); ctx.moveTo(rx, ry - 5); ctx.lineTo(rx + 3, ry); ctx.lineTo(rx, ry + 5); ctx.lineTo(rx - 3, ry); ctx.closePath(); ctx.fill();
        // Crystal blade — faceted, wider at 1/3, tapers to sharp point
        ctx.fillStyle = c.blade;
        ctx.beginPath(); ctx.moveTo(rx - 2, ry - 2); ctx.lineTo(rx - bL * 0.35, ry - 4); ctx.lineTo(rx - bL + 2, ry - 1); ctx.lineTo(rx - bL - c.tipLen, ry); ctx.lineTo(rx - bL + 2, ry + 1); ctx.lineTo(rx - bL * 0.35, ry + 4); ctx.lineTo(rx - 2, ry + 2); ctx.closePath(); ctx.fill();
        // Facet lines — crystal edges
        ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(rx - 2, ry); ctx.lineTo(rx - bL - c.tipLen, ry); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx - bL * 0.35, ry - 4); ctx.lineTo(rx - bL * 0.6, ry); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx - bL * 0.35, ry + 4); ctx.lineTo(rx - bL * 0.6, ry); ctx.stroke();
        // Bright sparkle at tip
        ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.arc(rx - bL - c.tipLen, ry, 2, 0, Math.PI * 2); ctx.fill();
      } else if (c.isCleaver) {
        // Cursed trident staff — long dark shaft with triple prong tip
        const bL = c.bladeLen;
        // Staff shaft
        ctx.fillStyle = "#2a0808"; ctx.fillRect(rx - bL + 8, ry - 1, bL + 4, 3);
        ctx.fillStyle = "#180505"; ctx.fillRect(rx - bL + 8, ry + 1, bL + 4, 1);
        // Shaft wrapping bands
        ctx.fillStyle = "#801010"; ctx.fillRect(rx - 2, ry - 2, 3, 5);
        ctx.fillStyle = "#701010"; ctx.fillRect(rx - bL * 0.4, ry - 2, 2, 5);
        // Center prong (longest)
        ctx.fillStyle = "#a01515"; ctx.fillRect(rx - bL - 6, ry - 1, 16, 3);
        ctx.fillStyle = "#c02020";
        ctx.beginPath(); ctx.moveTo(rx - bL - 6, ry - 1); ctx.lineTo(rx - bL - 12, ry + 0.5); ctx.lineTo(rx - bL - 6, ry + 2); ctx.fill();
        // Top prong
        ctx.fillStyle = "#901515";
        ctx.beginPath(); ctx.moveTo(rx - bL + 4, ry - 2); ctx.lineTo(rx - bL - 4, ry - 5); ctx.lineTo(rx - bL - 9, ry - 5); ctx.lineTo(rx - bL - 3, ry - 1); ctx.fill();
        // Bottom prong
        ctx.beginPath(); ctx.moveTo(rx - bL + 4, ry + 3); ctx.lineTo(rx - bL - 4, ry + 6); ctx.lineTo(rx - bL - 9, ry + 6); ctx.lineTo(rx - bL - 3, ry + 2); ctx.fill();
        // Red glow at tip
        ctx.fillStyle = "rgba(200,30,30,0.4)"; ctx.beginPath(); ctx.arc(rx - bL - 9, ry + 0.5, 4, 0, Math.PI * 2); ctx.fill();
        // Butt cap
        ctx.fillStyle = "#501010"; ctx.beginPath(); ctx.arc(rx + 12, ry + 0.5, 3, 0, Math.PI * 2); ctx.fill();
      } else if (c.isPickaxe) {
        // Pickaxe — single-sided curved pick (LEFT): handle right, head curves left-down
        const bL = c.bladeLen;
        const hx = rx - bL + 4; // where handle meets head
        // Wooden handle — long shaft
        ctx.fillStyle = c.handle; ctx.fillRect(hx + 3, ry - 2, bL - 2, 4);
        ctx.fillStyle = c.handleD; ctx.fillRect(hx + 3, ry + 1, bL - 2, 1);
        // Handle grip bands near hand
        ctx.fillStyle = "#6a4420"; ctx.fillRect(rx + 1, ry - 2.5, 3, 5);
        ctx.fillStyle = "#4a2a10"; ctx.fillRect(rx - 3, ry - 2.5, 3, 5);
        // Handle butt cap
        ctx.fillStyle = "#3a2818"; ctx.fillRect(rx + 4, ry - 1.5, 3, 3);
        // Head mount — thick block where shaft meets head
        ctx.fillStyle = "#6a6a78"; ctx.fillRect(hx, ry - 4, 5, 8);
        ctx.fillStyle = "#5a5a68"; ctx.fillRect(hx + 1, ry - 3, 3, 6);
        // Pick head — single thick curved blade going left and curving down
        ctx.fillStyle = c.blade;
        ctx.beginPath();
        ctx.moveTo(hx + 1, ry - 4);      // top of mount
        ctx.lineTo(hx - 5, ry - 6);      // head extends left-up
        ctx.lineTo(hx - 12, ry - 5);     // mid curve
        ctx.lineTo(hx - 18, ry - 2);     // approaching tip, curving down
        ctx.lineTo(hx - 21, ry + 2);     // sharp tip (curves down)
        ctx.lineTo(hx - 19, ry + 1);     // inner edge of tip
        ctx.lineTo(hx - 14, ry - 2);     // inner curve
        ctx.lineTo(hx - 7, ry - 3);      // inner near mount
        ctx.lineTo(hx + 1, ry - 1);      // back to mount
        ctx.closePath(); ctx.fill();
        // Back nub (small blunt end on opposite side)
        ctx.beginPath();
        ctx.moveTo(hx + 1, ry + 2);
        ctx.lineTo(hx - 3, ry + 4);
        ctx.lineTo(hx - 5, ry + 3);
        ctx.lineTo(hx - 3, ry + 1);
        ctx.lineTo(hx + 1, ry + 1);
        ctx.closePath(); ctx.fill();
        // Shadow on lower edge of head
        ctx.fillStyle = c.bladeD;
        ctx.beginPath();
        ctx.moveTo(hx - 5, ry - 3); ctx.lineTo(hx - 14, ry - 2); ctx.lineTo(hx - 19, ry + 1);
        ctx.lineTo(hx - 21, ry + 2); ctx.lineTo(hx - 18, ry); ctx.lineTo(hx - 12, ry - 2);
        ctx.lineTo(hx - 5, ry - 2);
        ctx.closePath(); ctx.fill();
        // Highlight on top edge
        ctx.fillStyle = "#b0bcc8";
        ctx.beginPath();
        ctx.moveTo(hx, ry - 4); ctx.lineTo(hx - 5, ry - 6); ctx.lineTo(hx - 12, ry - 5);
        ctx.lineTo(hx - 5, ry - 5); ctx.lineTo(hx, ry - 3.5);
        ctx.closePath(); ctx.fill();
      } else if (c.isFishingRod) {
        // Fishing rod (LEFT): handle right, rod extends left, reel near handle
        const bL = c.bladeLen;
        // Cork grip handle
        ctx.fillStyle = c.handle; ctx.fillRect(rx + 2, ry - 2, 10, 4);
        ctx.fillStyle = c.handleD; ctx.fillRect(rx + 3, ry + 1, 8, 1);
        // Reel (small circle at handle base)
        ctx.fillStyle = c.guard; ctx.beginPath(); ctx.arc(rx + 1, ry + 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#444"; ctx.beginPath(); ctx.arc(rx + 1, ry + 4, 1.5, 0, Math.PI * 2); ctx.fill();
        // Rod shaft — thin tapered pole
        ctx.fillStyle = c.blade;
        ctx.beginPath(); ctx.moveTo(rx, ry - 1); ctx.lineTo(rx - bL, ry - 0.5); ctx.lineTo(rx - bL, ry + 0.5); ctx.lineTo(rx, ry + 1); ctx.closePath(); ctx.fill();
        // Shadow on rod
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx - bL, ry + 0.5, bL, 0.5);
        // Line guides (small dots along rod)
        ctx.fillStyle = "#888";
        for (let g = 0; g < 3; g++) { const gx = rx - bL * (0.3 + g * 0.25); ctx.beginPath(); ctx.arc(gx, ry - 1, 1, 0, Math.PI * 2); ctx.fill(); }
        // Dangling line at tip
        ctx.strokeStyle = "rgba(200,200,200,0.5)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(rx - bL, ry); ctx.lineTo(rx - bL - 2, ry + 6); ctx.stroke();
      } else if (c.isFarmingHoe) {
        // Farming hoe (LEFT): shaft extends left, flat blade perpendicular at end
        const bL = c.bladeLen;
        // Wooden shaft
        ctx.fillStyle = c.handle; ctx.fillRect(rx + 2, ry - 2, 10, 4);
        ctx.fillStyle = c.handleD; ctx.fillRect(rx + 3, ry + 1, 8, 1);
        ctx.fillStyle = c.blade;
        ctx.fillRect(rx - bL + 6, ry - 1, bL - 6, 2);
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx - bL + 6, ry + 0.5, bL - 6, 0.5);
        // Flat hoe blade at end (perpendicular)
        ctx.fillStyle = c.blade; ctx.fillRect(rx - bL, ry - 6, 6, 12);
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx - bL, ry + 2, 6, 4);
      } else {
        ctx.fillStyle = c.blade; ctx.fillRect(rx - c.bladeLen, ry - 2, c.bladeLen, 4);
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx - c.bladeLen, ry + 1, c.bladeLen, 1);
        if (c.tipLen > 0) { ctx.fillStyle = c.blade; ctx.beginPath(); ctx.moveTo(rx - c.bladeLen, ry - 2); ctx.lineTo(rx - c.bladeLen - c.tipLen, ry); ctx.lineTo(rx - c.bladeLen, ry + 2); ctx.fill(); }
        ctx.fillStyle = "#e0e8ff"; ctx.fillRect(rx - c.bladeLen + 2, ry - 2, c.bladeLen - 4, 1);
      }
    } else if (pointDir === 3) { // RIGHT
      ctx.fillStyle = c.handle; ctx.fillRect(rx - 12, ry - 2, 10, 5);
      ctx.fillStyle = c.handleD; ctx.fillRect(rx - 11, ry - 1, 8, 3);
      ctx.fillStyle = c.guard; ctx.fillRect(rx - 3, ry - 4, 3, 9);
      if (c.isMace) {
        ctx.fillStyle = c.blade; ctx.fillRect(rx, ry - 2, c.bladeLen, 4);
        ctx.fillStyle = "#888"; ctx.beginPath(); ctx.arc(rx + c.bladeLen + 4, ry, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#aaa"; for (let s = 0; s < 4; s++) { const a = s * Math.PI / 2; ctx.beginPath(); ctx.arc(rx + c.bladeLen + 4 + Math.cos(a) * 6, ry + Math.sin(a) * 6, 2, 0, Math.PI * 2); ctx.fill(); }
      } else if (c.isSword) {
        const bL = c.bladeLen;
        ctx.fillStyle = "#c0a040"; ctx.beginPath(); ctx.arc(rx - 12, ry, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.blade;
        ctx.beginPath(); ctx.moveTo(rx, ry - 3); ctx.lineTo(rx + bL - 4, ry - 1); ctx.lineTo(rx + bL + c.tipLen, ry); ctx.lineTo(rx + bL - 4, ry + 1); ctx.lineTo(rx, ry + 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#7888aa"; ctx.fillRect(rx + 6, ry - 0.5, bL - 12, 1);
        ctx.fillStyle = "#dde4f0"; ctx.fillRect(rx, ry - 3, bL - 4, 1);
      } else if (c.isAxe) {
        ctx.fillStyle = c.handle; ctx.fillRect(rx, ry - 1, c.bladeLen - 8, 3);
        ctx.fillStyle = c.blade; ctx.beginPath(); ctx.moveTo(rx + c.bladeLen - 8, ry - 2); ctx.lineTo(rx + c.bladeLen, ry - 7); ctx.lineTo(rx + c.bladeLen + 4, ry); ctx.lineTo(rx + c.bladeLen, ry + 7); ctx.lineTo(rx + c.bladeLen - 8, ry + 2); ctx.fill();
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx + c.bladeLen - 8, ry + 3, 8, 2);
      } else if (c.isNinja) {
        const bL = c.bladeLen;
        ctx.fillStyle = "#1a1a1a"; ctx.fillRect(rx - 10, ry - 1, 8, 3);
        ctx.fillStyle = "#333"; ctx.fillRect(rx - 2, ry - 3, 2, 6);
        ctx.fillStyle = c.blade; ctx.fillRect(rx, ry - 1.5, bL, 3);
        ctx.fillStyle = "#2a2a3a"; ctx.fillRect(rx, ry - 1.5, bL, 1);
        ctx.fillStyle = c.blade; ctx.beginPath(); ctx.moveTo(rx + bL, ry - 1.5); ctx.lineTo(rx + bL + c.tipLen, ry); ctx.lineTo(rx + bL, ry + 1.5); ctx.fill();
        ctx.fillStyle = "rgba(80,50,120,0.3)"; ctx.fillRect(rx + 2, ry - 2, bL - 4, 1);
      } else if (c.isStorm) {
        const bL = c.bladeLen;
        ctx.fillStyle = c.handle; ctx.fillRect(rx - 12, ry - 2, 10, 4);
        ctx.fillStyle = "#d0e0ff"; ctx.beginPath(); ctx.moveTo(rx, ry - 5); ctx.lineTo(rx + 3, ry); ctx.lineTo(rx, ry + 5); ctx.lineTo(rx - 3, ry); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c.blade;
        ctx.beginPath(); ctx.moveTo(rx + 2, ry - 2); ctx.lineTo(rx + bL * 0.35, ry - 4); ctx.lineTo(rx + bL - 2, ry - 1); ctx.lineTo(rx + bL + c.tipLen, ry); ctx.lineTo(rx + bL - 2, ry + 1); ctx.lineTo(rx + bL * 0.35, ry + 4); ctx.lineTo(rx + 2, ry + 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(rx + 2, ry); ctx.lineTo(rx + bL + c.tipLen, ry); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx + bL * 0.35, ry - 4); ctx.lineTo(rx + bL * 0.6, ry); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx + bL * 0.35, ry + 4); ctx.lineTo(rx + bL * 0.6, ry); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.arc(rx + bL + c.tipLen, ry, 2, 0, Math.PI * 2); ctx.fill();
      } else if (c.isCleaver) {
        const bL = c.bladeLen;
        // Staff shaft
        ctx.fillStyle = "#2a0808"; ctx.fillRect(rx - 12, ry - 1, bL + 4, 3);
        ctx.fillStyle = "#180505"; ctx.fillRect(rx - 12, ry + 1, bL + 4, 1);
        // Shaft wrapping bands
        ctx.fillStyle = "#801010"; ctx.fillRect(rx - 1, ry - 2, 3, 5);
        ctx.fillStyle = "#701010"; ctx.fillRect(rx + bL * 0.4, ry - 2, 2, 5);
        // Center prong
        ctx.fillStyle = "#a01515"; ctx.fillRect(rx + bL - 8, ry - 1, 16, 3);
        ctx.fillStyle = "#c02020";
        ctx.beginPath(); ctx.moveTo(rx + bL + 6, ry - 1); ctx.lineTo(rx + bL + 12, ry + 0.5); ctx.lineTo(rx + bL + 6, ry + 2); ctx.fill();
        // Top prong
        ctx.fillStyle = "#901515";
        ctx.beginPath(); ctx.moveTo(rx + bL - 4, ry - 2); ctx.lineTo(rx + bL + 4, ry - 5); ctx.lineTo(rx + bL + 9, ry - 5); ctx.lineTo(rx + bL + 3, ry - 1); ctx.fill();
        // Bottom prong
        ctx.beginPath(); ctx.moveTo(rx + bL - 4, ry + 3); ctx.lineTo(rx + bL + 4, ry + 6); ctx.lineTo(rx + bL + 9, ry + 6); ctx.lineTo(rx + bL + 3, ry + 2); ctx.fill();
        // Red glow
        ctx.fillStyle = "rgba(200,30,30,0.4)"; ctx.beginPath(); ctx.arc(rx + bL + 9, ry + 0.5, 4, 0, Math.PI * 2); ctx.fill();
        // Butt cap
        ctx.fillStyle = "#501010"; ctx.beginPath(); ctx.arc(rx - 12, ry + 0.5, 3, 0, Math.PI * 2); ctx.fill();
      } else if (c.isPickaxe) {
        // Pickaxe — single-sided curved pick (RIGHT): handle left, head curves right-down
        const bL = c.bladeLen;
        const hx = rx + bL - 4; // where handle meets head
        // Wooden handle — long shaft
        ctx.fillStyle = c.handle; ctx.fillRect(rx - bL + 4, ry - 2, bL - 2, 4);
        ctx.fillStyle = c.handleD; ctx.fillRect(rx - bL + 4, ry + 1, bL - 2, 1);
        // Handle grip bands near hand
        ctx.fillStyle = "#6a4420"; ctx.fillRect(rx - 4, ry - 2.5, 3, 5);
        ctx.fillStyle = "#4a2a10"; ctx.fillRect(rx, ry - 2.5, 3, 5);
        // Handle butt cap
        ctx.fillStyle = "#3a2818"; ctx.fillRect(rx - 7, ry - 1.5, 3, 3);
        // Head mount — thick block
        ctx.fillStyle = "#6a6a78"; ctx.fillRect(hx - 4, ry - 4, 5, 8);
        ctx.fillStyle = "#5a5a68"; ctx.fillRect(hx - 3, ry - 3, 3, 6);
        // Pick head — single thick curved blade going right and curving down
        ctx.fillStyle = c.blade;
        ctx.beginPath();
        ctx.moveTo(hx - 1, ry - 4);
        ctx.lineTo(hx + 5, ry - 6);
        ctx.lineTo(hx + 12, ry - 5);
        ctx.lineTo(hx + 18, ry - 2);
        ctx.lineTo(hx + 21, ry + 2);     // sharp tip
        ctx.lineTo(hx + 19, ry + 1);
        ctx.lineTo(hx + 14, ry - 2);
        ctx.lineTo(hx + 7, ry - 3);
        ctx.lineTo(hx - 1, ry - 1);
        ctx.closePath(); ctx.fill();
        // Back nub
        ctx.beginPath();
        ctx.moveTo(hx - 1, ry + 2);
        ctx.lineTo(hx + 3, ry + 4);
        ctx.lineTo(hx + 5, ry + 3);
        ctx.lineTo(hx + 3, ry + 1);
        ctx.lineTo(hx - 1, ry + 1);
        ctx.closePath(); ctx.fill();
        // Shadow on lower edge
        ctx.fillStyle = c.bladeD;
        ctx.beginPath();
        ctx.moveTo(hx + 5, ry - 3); ctx.lineTo(hx + 14, ry - 2); ctx.lineTo(hx + 19, ry + 1);
        ctx.lineTo(hx + 21, ry + 2); ctx.lineTo(hx + 18, ry); ctx.lineTo(hx + 12, ry - 2);
        ctx.lineTo(hx + 5, ry - 2);
        ctx.closePath(); ctx.fill();
        // Highlight on top edge
        ctx.fillStyle = "#b0bcc8";
        ctx.beginPath();
        ctx.moveTo(hx, ry - 4); ctx.lineTo(hx + 5, ry - 6); ctx.lineTo(hx + 12, ry - 5);
        ctx.lineTo(hx + 5, ry - 5); ctx.lineTo(hx, ry - 3.5);
        ctx.closePath(); ctx.fill();
      } else if (c.isFishingRod) {
        // Fishing rod (RIGHT): handle left, rod extends right
        const bL = c.bladeLen;
        ctx.fillStyle = c.handle; ctx.fillRect(rx - 12, ry - 2, 10, 4);
        ctx.fillStyle = c.handleD; ctx.fillRect(rx - 11, ry + 1, 8, 1);
        ctx.fillStyle = c.guard; ctx.beginPath(); ctx.arc(rx - 1, ry + 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#444"; ctx.beginPath(); ctx.arc(rx - 1, ry + 4, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.blade;
        ctx.beginPath(); ctx.moveTo(rx, ry - 1); ctx.lineTo(rx + bL, ry - 0.5); ctx.lineTo(rx + bL, ry + 0.5); ctx.lineTo(rx, ry + 1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx, ry + 0.5, bL, 0.5);
        ctx.fillStyle = "#888";
        for (let g = 0; g < 3; g++) { const gx = rx + bL * (0.3 + g * 0.25); ctx.beginPath(); ctx.arc(gx, ry - 1, 1, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = "rgba(200,200,200,0.5)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(rx + bL, ry); ctx.lineTo(rx + bL + 2, ry + 6); ctx.stroke();
      } else if (c.isFarmingHoe) {
        // Farming hoe (RIGHT): shaft extends right, flat blade at end
        const bL = c.bladeLen;
        ctx.fillStyle = c.handle; ctx.fillRect(rx - 12, ry - 2, 10, 4);
        ctx.fillStyle = c.handleD; ctx.fillRect(rx - 11, ry + 1, 8, 1);
        ctx.fillStyle = c.blade;
        ctx.fillRect(rx, ry - 1, bL - 6, 2);
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx, ry + 0.5, bL - 6, 0.5);
        // Flat hoe blade
        ctx.fillStyle = c.blade; ctx.fillRect(rx + bL - 6, ry - 6, 6, 12);
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx + bL - 6, ry + 2, 6, 4);
      } else {
        ctx.fillStyle = c.blade; ctx.fillRect(rx, ry - 2, c.bladeLen, 4);
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx, ry + 1, c.bladeLen, 1);
        if (c.tipLen > 0) { ctx.fillStyle = c.blade; ctx.beginPath(); ctx.moveTo(rx + c.bladeLen, ry - 2); ctx.lineTo(rx + c.bladeLen + c.tipLen, ry); ctx.lineTo(rx + c.bladeLen, ry + 2); ctx.fill(); }
        ctx.fillStyle = "#e0e8ff"; ctx.fillRect(rx + 2, ry - 2, c.bladeLen - 4, 1);
      }
    } else if (pointDir === 0) { // DOWN
      ctx.fillStyle = c.handle; ctx.fillRect(rx - 2, ry - 12, 5, 10);
      ctx.fillStyle = c.handleD; ctx.fillRect(rx - 1, ry - 11, 3, 8);
      ctx.fillStyle = c.guard; ctx.fillRect(rx - 4, ry - 3, 9, 3);
      if (c.isMace) {
        ctx.fillStyle = c.blade; ctx.fillRect(rx - 2, ry, 4, c.bladeLen);
        ctx.fillStyle = "#888"; ctx.beginPath(); ctx.arc(rx, ry + c.bladeLen + 4, 6, 0, Math.PI * 2); ctx.fill();
      } else if (c.isSword) {
        const bL = c.bladeLen;
        ctx.fillStyle = "#c0a040"; ctx.beginPath(); ctx.arc(rx, ry - 12, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.blade;
        ctx.beginPath(); ctx.moveTo(rx - 3, ry); ctx.lineTo(rx - 1, ry + bL - 4); ctx.lineTo(rx, ry + bL + c.tipLen); ctx.lineTo(rx + 1, ry + bL - 4); ctx.lineTo(rx + 3, ry); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#7888aa"; ctx.fillRect(rx - 0.5, ry + 6, 1, bL - 12);
        ctx.fillStyle = "#dde4f0"; ctx.fillRect(rx - 3, ry, 1, bL - 4);
      } else if (c.isAxe) {
        ctx.fillStyle = c.handle; ctx.fillRect(rx - 1, ry, 3, c.bladeLen - 8);
        ctx.fillStyle = c.blade; ctx.beginPath(); ctx.moveTo(rx - 2, ry + c.bladeLen - 8); ctx.lineTo(rx - 7, ry + c.bladeLen); ctx.lineTo(rx, ry + c.bladeLen + 4); ctx.lineTo(rx + 7, ry + c.bladeLen); ctx.lineTo(rx + 2, ry + c.bladeLen - 8); ctx.fill();
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx + 3, ry + c.bladeLen - 8, 2, 8);
      } else if (c.isNinja) {
        const bL = c.bladeLen;
        ctx.fillStyle = "#1a1a1a"; ctx.fillRect(rx - 1, ry - 10, 3, 8);
        ctx.fillStyle = "#333"; ctx.fillRect(rx - 3, ry - 2, 6, 2);
        ctx.fillStyle = c.blade; ctx.fillRect(rx - 1.5, ry, 3, bL);
        ctx.fillStyle = "#2a2a3a"; ctx.fillRect(rx - 1.5, ry, 1, bL);
        ctx.fillStyle = c.blade; ctx.beginPath(); ctx.moveTo(rx - 1.5, ry + bL); ctx.lineTo(rx, ry + bL + c.tipLen); ctx.lineTo(rx + 1.5, ry + bL); ctx.fill();
      } else if (c.isStorm) {
        const bL = c.bladeLen;
        ctx.fillStyle = c.handle; ctx.fillRect(rx - 2, ry - 12, 4, 10);
        ctx.fillStyle = "#d0e0ff"; ctx.beginPath(); ctx.moveTo(rx - 5, ry); ctx.lineTo(rx, ry + 3); ctx.lineTo(rx + 5, ry); ctx.lineTo(rx, ry - 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c.blade;
        ctx.beginPath(); ctx.moveTo(rx - 2, ry + 2); ctx.lineTo(rx - 4, ry + bL * 0.35); ctx.lineTo(rx - 1, ry + bL - 2); ctx.lineTo(rx, ry + bL + c.tipLen); ctx.lineTo(rx + 1, ry + bL - 2); ctx.lineTo(rx + 4, ry + bL * 0.35); ctx.lineTo(rx + 2, ry + 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(rx, ry + 2); ctx.lineTo(rx, ry + bL + c.tipLen); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.arc(rx, ry + bL + c.tipLen, 2, 0, Math.PI * 2); ctx.fill();
      } else if (c.isCleaver) {
        const bL = c.bladeLen;
        // Staff shaft vertical
        ctx.fillStyle = "#2a0808"; ctx.fillRect(rx - 1, ry - 12, 3, bL + 4);
        ctx.fillStyle = "#180505"; ctx.fillRect(rx + 1, ry - 12, 1, bL + 4);
        // Wrapping bands
        ctx.fillStyle = "#801010"; ctx.fillRect(rx - 2, ry - 1, 5, 3);
        ctx.fillStyle = "#701010"; ctx.fillRect(rx - 2, ry + bL * 0.4, 5, 2);
        // Center prong
        ctx.fillStyle = "#a01515"; ctx.fillRect(rx - 1, ry + bL - 8, 3, 16);
        ctx.fillStyle = "#c02020";
        ctx.beginPath(); ctx.moveTo(rx - 1, ry + bL + 6); ctx.lineTo(rx + 0.5, ry + bL + 12); ctx.lineTo(rx + 2, ry + bL + 6); ctx.fill();
        // Left prong
        ctx.fillStyle = "#901515";
        ctx.beginPath(); ctx.moveTo(rx - 2, ry + bL - 4); ctx.lineTo(rx - 5, ry + bL + 4); ctx.lineTo(rx - 5, ry + bL + 9); ctx.lineTo(rx - 1, ry + bL + 3); ctx.fill();
        // Right prong
        ctx.beginPath(); ctx.moveTo(rx + 3, ry + bL - 4); ctx.lineTo(rx + 6, ry + bL + 4); ctx.lineTo(rx + 6, ry + bL + 9); ctx.lineTo(rx + 2, ry + bL + 3); ctx.fill();
        // Red glow
        ctx.fillStyle = "rgba(200,30,30,0.4)"; ctx.beginPath(); ctx.arc(rx + 0.5, ry + bL + 9, 4, 0, Math.PI * 2); ctx.fill();
        // Butt cap
        ctx.fillStyle = "#501010"; ctx.beginPath(); ctx.arc(rx + 0.5, ry - 12, 3, 0, Math.PI * 2); ctx.fill();
      } else if (c.isPickaxe) {
        // Pickaxe — single-sided curved pick (DOWN): handle up, head curves down-right
        const bL = c.bladeLen;
        const hy = ry + bL - 4; // where handle meets head
        // Wooden handle — long shaft going up
        ctx.fillStyle = c.handle; ctx.fillRect(rx - 2, ry - 8, 4, bL - 2);
        ctx.fillStyle = c.handleD; ctx.fillRect(rx + 1, ry - 8, 1, bL - 2);
        // Handle grip bands
        ctx.fillStyle = "#6a4420"; ctx.fillRect(rx - 2.5, ry - 6, 5, 3);
        ctx.fillStyle = "#4a2a10"; ctx.fillRect(rx - 2.5, ry - 2, 5, 3);
        // Handle butt cap
        ctx.fillStyle = "#3a2818"; ctx.fillRect(rx - 1.5, ry - 9, 3, 3);
        // Head mount — thick block
        ctx.fillStyle = "#6a6a78"; ctx.fillRect(rx - 4, hy - 4, 8, 5);
        ctx.fillStyle = "#5a5a68"; ctx.fillRect(rx - 3, hy - 3, 6, 3);
        // Pick head — curves down and to the right
        ctx.fillStyle = c.blade;
        ctx.beginPath();
        ctx.moveTo(rx + 4, hy - 1);      // right of mount
        ctx.lineTo(rx + 6, hy + 5);      // head extends down-right
        ctx.lineTo(rx + 5, hy + 12);     // mid curve
        ctx.lineTo(rx + 2, hy + 18);     // approaching tip
        ctx.lineTo(rx - 2, hy + 21);     // sharp tip (curves left)
        ctx.lineTo(rx - 1, hy + 19);     // inner edge
        ctx.lineTo(rx + 2, hy + 14);     // inner curve
        ctx.lineTo(rx + 3, hy + 7);      // inner near mount
        ctx.lineTo(rx + 1, hy - 1);      // back to mount
        ctx.closePath(); ctx.fill();
        // Back nub (opposite side)
        ctx.beginPath();
        ctx.moveTo(rx - 2, hy - 1);
        ctx.lineTo(rx - 4, hy + 3);
        ctx.lineTo(rx - 3, hy + 5);
        ctx.lineTo(rx - 1, hy + 3);
        ctx.lineTo(rx - 1, hy - 1);
        ctx.closePath(); ctx.fill();
        // Shadow on right edge
        ctx.fillStyle = c.bladeD;
        ctx.beginPath();
        ctx.moveTo(rx + 3, hy + 5); ctx.lineTo(rx + 2, hy + 14); ctx.lineTo(rx - 1, hy + 19);
        ctx.lineTo(rx - 2, hy + 21); ctx.lineTo(rx, hy + 18); ctx.lineTo(rx + 2, hy + 12);
        ctx.lineTo(rx + 2, hy + 5);
        ctx.closePath(); ctx.fill();
        // Highlight on left edge
        ctx.fillStyle = "#b0bcc8";
        ctx.beginPath();
        ctx.moveTo(rx + 4, hy - 1); ctx.lineTo(rx + 6, hy + 5); ctx.lineTo(rx + 5, hy + 12);
        ctx.lineTo(rx + 5, hy + 5); ctx.lineTo(rx + 3.5, hy);
        ctx.closePath(); ctx.fill();
      } else if (c.isFishingRod) {
        // Fishing rod (DOWN): handle up, rod extends down
        const bL = c.bladeLen;
        ctx.fillStyle = c.handle; ctx.fillRect(rx - 2, ry - 12, 4, 10);
        ctx.fillStyle = c.handleD; ctx.fillRect(rx + 1, ry - 11, 1, 8);
        ctx.fillStyle = c.guard; ctx.beginPath(); ctx.arc(rx + 4, ry - 1, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#444"; ctx.beginPath(); ctx.arc(rx + 4, ry - 1, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.blade;
        ctx.beginPath(); ctx.moveTo(rx - 1, ry); ctx.lineTo(rx - 0.5, ry + bL); ctx.lineTo(rx + 0.5, ry + bL); ctx.lineTo(rx + 1, ry); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx + 0.5, ry, 0.5, bL);
        ctx.fillStyle = "#888";
        for (let g = 0; g < 3; g++) { const gy = ry + bL * (0.3 + g * 0.25); ctx.beginPath(); ctx.arc(rx - 1, gy, 1, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = "rgba(200,200,200,0.5)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(rx, ry + bL); ctx.lineTo(rx - 4, ry + bL + 4); ctx.stroke();
      } else if (c.isFarmingHoe) {
        // Farming hoe (DOWN): shaft extends down, flat blade at end
        const bL = c.bladeLen;
        ctx.fillStyle = c.handle; ctx.fillRect(rx - 2, ry - 12, 4, 10);
        ctx.fillStyle = c.handleD; ctx.fillRect(rx + 1, ry - 11, 1, 8);
        ctx.fillStyle = c.blade;
        ctx.fillRect(rx - 1, ry, 2, bL - 6);
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx + 0.5, ry, 0.5, bL - 6);
        // Flat hoe blade (horizontal)
        ctx.fillStyle = c.blade; ctx.fillRect(rx - 6, ry + bL - 6, 12, 6);
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx + 2, ry + bL - 6, 4, 6);
      } else {
        ctx.fillStyle = c.blade; ctx.fillRect(rx - 2, ry, 4, c.bladeLen);
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx + 1, ry, 1, c.bladeLen);
        if (c.tipLen > 0) { ctx.fillStyle = c.blade; ctx.beginPath(); ctx.moveTo(rx - 2, ry + c.bladeLen); ctx.lineTo(rx, ry + c.bladeLen + c.tipLen); ctx.lineTo(rx + 2, ry + c.bladeLen); ctx.fill(); }
      }
    } else { // UP
      ctx.fillStyle = c.handle; ctx.fillRect(rx - 2, ry + 2, 5, 10);
      ctx.fillStyle = c.handleD; ctx.fillRect(rx - 1, ry + 3, 3, 8);
      ctx.fillStyle = c.guard; ctx.fillRect(rx - 4, ry, 9, 3);
      if (c.isMace) {
        ctx.fillStyle = c.blade; ctx.fillRect(rx - 2, ry - c.bladeLen, 4, c.bladeLen);
        ctx.fillStyle = "#888"; ctx.beginPath(); ctx.arc(rx, ry - c.bladeLen - 4, 6, 0, Math.PI * 2); ctx.fill();
      } else if (c.isSword) {
        const bL = c.bladeLen;
        ctx.fillStyle = "#c0a040"; ctx.beginPath(); ctx.arc(rx, ry + 12, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.blade;
        ctx.beginPath(); ctx.moveTo(rx - 3, ry); ctx.lineTo(rx - 1, ry - bL + 4); ctx.lineTo(rx, ry - bL - c.tipLen); ctx.lineTo(rx + 1, ry - bL + 4); ctx.lineTo(rx + 3, ry); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#7888aa"; ctx.fillRect(rx - 0.5, ry - bL + 6, 1, bL - 12);
        ctx.fillStyle = "#dde4f0"; ctx.fillRect(rx - 3, ry - bL + 4, 1, bL - 4);
      } else if (c.isAxe) {
        ctx.fillStyle = c.handle; ctx.fillRect(rx - 1, ry - c.bladeLen + 8, 3, c.bladeLen - 8);
        ctx.fillStyle = c.blade; ctx.beginPath(); ctx.moveTo(rx - 2, ry - c.bladeLen + 8); ctx.lineTo(rx - 7, ry - c.bladeLen); ctx.lineTo(rx, ry - c.bladeLen - 4); ctx.lineTo(rx + 7, ry - c.bladeLen); ctx.lineTo(rx + 2, ry - c.bladeLen + 8); ctx.fill();
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx + 3, ry - c.bladeLen, 2, 8);
      } else if (c.isNinja) {
        const bL = c.bladeLen;
        ctx.fillStyle = "#1a1a1a"; ctx.fillRect(rx - 1, ry + 2, 3, 8);
        ctx.fillStyle = "#333"; ctx.fillRect(rx - 3, ry, 6, 2);
        ctx.fillStyle = c.blade; ctx.fillRect(rx - 1.5, ry - bL, 3, bL);
        ctx.fillStyle = "#2a2a3a"; ctx.fillRect(rx - 1.5, ry - bL, 1, bL);
        ctx.fillStyle = c.blade; ctx.beginPath(); ctx.moveTo(rx - 1.5, ry - bL); ctx.lineTo(rx, ry - bL - c.tipLen); ctx.lineTo(rx + 1.5, ry - bL); ctx.fill();
      } else if (c.isStorm) {
        const bL = c.bladeLen;
        ctx.fillStyle = c.handle; ctx.fillRect(rx - 2, ry + 2, 4, 10);
        ctx.fillStyle = "#d0e0ff"; ctx.beginPath(); ctx.moveTo(rx - 5, ry); ctx.lineTo(rx, ry - 3); ctx.lineTo(rx + 5, ry); ctx.lineTo(rx, ry + 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c.blade;
        ctx.beginPath(); ctx.moveTo(rx - 2, ry - 2); ctx.lineTo(rx - 4, ry - bL * 0.35); ctx.lineTo(rx - 1, ry - bL + 2); ctx.lineTo(rx, ry - bL - c.tipLen); ctx.lineTo(rx + 1, ry - bL + 2); ctx.lineTo(rx + 4, ry - bL * 0.35); ctx.lineTo(rx + 2, ry - 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(rx, ry - 2); ctx.lineTo(rx, ry - bL - c.tipLen); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.arc(rx, ry - bL - c.tipLen, 2, 0, Math.PI * 2); ctx.fill();
      } else if (c.isCleaver) {
        const bL = c.bladeLen;
        // Staff shaft vertical (up)
        ctx.fillStyle = "#2a0808"; ctx.fillRect(rx - 1, ry - bL + 8, 3, bL + 4);
        ctx.fillStyle = "#180505"; ctx.fillRect(rx + 1, ry - bL + 8, 1, bL + 4);
        // Wrapping bands
        ctx.fillStyle = "#801010"; ctx.fillRect(rx - 2, ry - 1, 5, 3);
        ctx.fillStyle = "#701010"; ctx.fillRect(rx - 2, ry - bL * 0.4, 5, 2);
        // Center prong
        ctx.fillStyle = "#a01515"; ctx.fillRect(rx - 1, ry - bL - 8, 3, 16);
        ctx.fillStyle = "#c02020";
        ctx.beginPath(); ctx.moveTo(rx - 1, ry - bL - 6); ctx.lineTo(rx + 0.5, ry - bL - 12); ctx.lineTo(rx + 2, ry - bL - 6); ctx.fill();
        // Left prong
        ctx.fillStyle = "#901515";
        ctx.beginPath(); ctx.moveTo(rx - 2, ry - bL + 4); ctx.lineTo(rx - 5, ry - bL - 4); ctx.lineTo(rx - 5, ry - bL - 9); ctx.lineTo(rx - 1, ry - bL - 3); ctx.fill();
        // Right prong
        ctx.beginPath(); ctx.moveTo(rx + 3, ry - bL + 4); ctx.lineTo(rx + 6, ry - bL - 4); ctx.lineTo(rx + 6, ry - bL - 9); ctx.lineTo(rx + 2, ry - bL - 3); ctx.fill();
        // Red glow
        ctx.fillStyle = "rgba(200,30,30,0.4)"; ctx.beginPath(); ctx.arc(rx + 0.5, ry - bL - 9, 4, 0, Math.PI * 2); ctx.fill();
        // Butt cap
        ctx.fillStyle = "#501010"; ctx.beginPath(); ctx.arc(rx + 0.5, ry + 12, 3, 0, Math.PI * 2); ctx.fill();
      } else if (c.isPickaxe) {
        // Pickaxe — single-sided curved pick (UP): handle down, head curves up-left
        const bL = c.bladeLen;
        const hy = ry - bL + 4; // where handle meets head
        // Wooden handle — long shaft going down
        ctx.fillStyle = c.handle; ctx.fillRect(rx - 2, ry + 8 - bL, 4, bL - 2);
        ctx.fillStyle = c.handleD; ctx.fillRect(rx + 1, ry + 8 - bL, 1, bL - 2);
        // Handle grip bands
        ctx.fillStyle = "#6a4420"; ctx.fillRect(rx - 2.5, ry + 3, 5, 3);
        ctx.fillStyle = "#4a2a10"; ctx.fillRect(rx - 2.5, ry - 1, 5, 3);
        // Handle butt cap
        ctx.fillStyle = "#3a2818"; ctx.fillRect(rx - 1.5, ry + 6, 3, 3);
        // Head mount — thick block
        ctx.fillStyle = "#6a6a78"; ctx.fillRect(rx - 4, hy, 8, 5);
        ctx.fillStyle = "#5a5a68"; ctx.fillRect(rx - 3, hy + 1, 6, 3);
        // Pick head — curves up and to the left
        ctx.fillStyle = c.blade;
        ctx.beginPath();
        ctx.moveTo(rx - 4, hy + 1);      // left of mount
        ctx.lineTo(rx - 6, hy - 5);      // head extends up-left
        ctx.lineTo(rx - 5, hy - 12);     // mid curve
        ctx.lineTo(rx - 2, hy - 18);     // approaching tip
        ctx.lineTo(rx + 2, hy - 21);     // sharp tip (curves right)
        ctx.lineTo(rx + 1, hy - 19);     // inner edge
        ctx.lineTo(rx - 2, hy - 14);     // inner curve
        ctx.lineTo(rx - 3, hy - 7);      // inner near mount
        ctx.lineTo(rx - 1, hy + 1);      // back to mount
        ctx.closePath(); ctx.fill();
        // Back nub (opposite side)
        ctx.beginPath();
        ctx.moveTo(rx + 2, hy + 1);
        ctx.lineTo(rx + 4, hy - 3);
        ctx.lineTo(rx + 3, hy - 5);
        ctx.lineTo(rx + 1, hy - 3);
        ctx.lineTo(rx + 1, hy + 1);
        ctx.closePath(); ctx.fill();
        // Shadow on right edge
        ctx.fillStyle = c.bladeD;
        ctx.beginPath();
        ctx.moveTo(rx - 3, hy - 5); ctx.lineTo(rx - 2, hy - 14); ctx.lineTo(rx + 1, hy - 19);
        ctx.lineTo(rx + 2, hy - 21); ctx.lineTo(rx, hy - 18); ctx.lineTo(rx - 2, hy - 12);
        ctx.lineTo(rx - 2, hy - 5);
        ctx.closePath(); ctx.fill();
        // Highlight on left edge
        ctx.fillStyle = "#b0bcc8";
        ctx.beginPath();
        ctx.moveTo(rx - 4, hy + 1); ctx.lineTo(rx - 6, hy - 5); ctx.lineTo(rx - 5, hy - 12);
        ctx.lineTo(rx - 5, hy - 5); ctx.lineTo(rx - 3.5, hy);
        ctx.closePath(); ctx.fill();
      } else if (c.isFishingRod) {
        // Fishing rod (UP): handle down, rod extends up
        const bL = c.bladeLen;
        ctx.fillStyle = c.handle; ctx.fillRect(rx - 2, ry + 2, 4, 10);
        ctx.fillStyle = c.handleD; ctx.fillRect(rx + 1, ry + 3, 1, 8);
        ctx.fillStyle = c.guard; ctx.beginPath(); ctx.arc(rx + 4, ry + 1, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#444"; ctx.beginPath(); ctx.arc(rx + 4, ry + 1, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.blade;
        ctx.beginPath(); ctx.moveTo(rx - 1, ry); ctx.lineTo(rx - 0.5, ry - bL); ctx.lineTo(rx + 0.5, ry - bL); ctx.lineTo(rx + 1, ry); ctx.closePath(); ctx.fill();
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx + 0.5, ry - bL, 0.5, bL);
        ctx.fillStyle = "#888";
        for (let g = 0; g < 3; g++) { const gy = ry - bL * (0.3 + g * 0.25); ctx.beginPath(); ctx.arc(rx - 1, gy, 1, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = "rgba(200,200,200,0.5)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(rx, ry - bL); ctx.lineTo(rx - 4, ry - bL - 4); ctx.stroke();
      } else if (c.isFarmingHoe) {
        // Farming hoe (UP): shaft extends up, flat blade at end
        const bL = c.bladeLen;
        ctx.fillStyle = c.handle; ctx.fillRect(rx - 2, ry + 2, 4, 10);
        ctx.fillStyle = c.handleD; ctx.fillRect(rx + 1, ry + 3, 1, 8);
        ctx.fillStyle = c.blade;
        ctx.fillRect(rx - 1, ry - bL + 6, 2, bL - 6);
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx + 0.5, ry - bL + 6, 0.5, bL - 6);
        // Flat hoe blade (horizontal)
        ctx.fillStyle = c.blade; ctx.fillRect(rx - 6, ry - bL, 12, 6);
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx + 2, ry - bL, 4, 6);
      } else {
        ctx.fillStyle = c.blade; ctx.fillRect(rx - 2, ry - c.bladeLen, 4, c.bladeLen);
        ctx.fillStyle = c.bladeD; ctx.fillRect(rx + 1, ry - c.bladeLen, 1, c.bladeLen);
        if (c.tipLen > 0) { ctx.fillStyle = c.blade; ctx.beginPath(); ctx.moveTo(rx - 2, ry - c.bladeLen); ctx.lineTo(rx, ry - c.bladeLen - c.tipLen); ctx.lineTo(rx + 2, ry - c.bladeLen); ctx.fill(); }
      }
    }
  };

  if (dir === 0) { // facing DOWN — character's left hand is on SCREEN RIGHT
    drawFreeArm(bodyL - 4, y + 29 + bobY + armSwing); // right hand = screen left
    // Gun arm on screen-right (character's left)
    ctx.fillStyle = black; ctx.fillRect(bodyR - 2, y + 30 + bobY, 7, 8);
    drawGunArm(bodyR - 1, armY, bodyR + 1, armY + 6, 0);
  } else if (dir === 1) { // facing UP — character's left hand is on SCREEN LEFT
    drawFreeArm(bodyR - 2, y + 29 + bobY - armSwing); // right hand = screen right
    // Gun arm on screen-left (character's left)
    ctx.fillStyle = black; ctx.fillRect(bodyL - 4, y + 30 + bobY, 7, 8);
    drawGunArm(bodyL - 3, y + 29 + bobY, bodyL - 1, y + 28 + bobY, 1);
  } else if (dir === 2) { // facing LEFT — character's left hand is lower/front
    drawFreeArm(bodyL + 12, y + 29 + bobY - armSwing); // right hand behind (center-ish)
    // Gun arm on lower front, extends left
    ctx.fillStyle = black; ctx.fillRect(bodyL + 8, armY - 2, 10, 7);
    ctx.fillStyle = skin; ctx.fillRect(bodyL + 4, armY - 1, 5, 5);
    drawGunArm(bodyL + 4, armY, bodyL + 2, armY, 2);
  } else { // facing RIGHT — character's left hand is BACK
    drawFreeArm(bodyL - 2, y + 29 + bobY + armSwing); // right hand in front
    // Gun arm extends right (back arm crosses over)
    ctx.fillStyle = black; ctx.fillRect(bodyR - 2, armY - 4, 10, 7);
    drawGunArm(bodyR + 6, armY - 3, bodyR + 9, armY, 3);
  }

  // === HEAD ===
  const hx = x - 2, hy = y + bobY;
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.roundRect(hx + 4, hy + 6, 32, 26, 7); ctx.fill();

  // === WILD MESSY HAIR (Choso style - big, spiky, messy) ===
  ctx.fillStyle = hairColor;
  // Main hair mass — rounded base
  ctx.beginPath(); ctx.roundRect(hx - 2, hy - 1, 44, 18, 6); ctx.fill();
  // Wider top portion
  ctx.beginPath(); ctx.roundRect(hx - 4, hy - 2, 48, 14, 5); ctx.fill();

  // Wild spikes going in different directions
  // Left wild spikes
  ctx.beginPath(); ctx.moveTo(hx - 4, hy + 4); ctx.lineTo(hx - 12, hy - 8); ctx.lineTo(hx + 2, hy + 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx - 2, hy + 8); ctx.lineTo(hx - 10, hy + 2); ctx.lineTo(hx + 2, hy + 10); ctx.fill();

  // Top spikes - messy, uneven
  ctx.beginPath(); ctx.moveTo(hx + 2, hy - 2); ctx.lineTo(hx + 5, hy - 16); ctx.lineTo(hx + 10, hy); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 7, hy - 2); ctx.lineTo(hx + 14, hy - 20); ctx.lineTo(hx + 19, hy - 1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 14, hy - 1); ctx.lineTo(hx + 20, hy - 18); ctx.lineTo(hx + 26, hy); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 22, hy - 1); ctx.lineTo(hx + 28, hy - 15); ctx.lineTo(hx + 34, hy); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 30, hy - 1); ctx.lineTo(hx + 36, hy - 12); ctx.lineTo(hx + 42, hy + 2); ctx.fill();

  // Right wild spikes
  ctx.beginPath(); ctx.moveTo(hx + 40, hy + 4); ctx.lineTo(hx + 50, hy - 6); ctx.lineTo(hx + 42, hy + 6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 40, hy + 8); ctx.lineTo(hx + 48, hy + 3); ctx.lineTo(hx + 40, hy + 12); ctx.fill();

  // Hair texture - subtle darker strands
  ctx.fillStyle = darkenColor(hairColor, 0.78);
  ctx.fillRect(hx + 6, hy + 2, 2, 14);
  ctx.fillRect(hx + 16, hy + 1, 2, 12);
  ctx.fillRect(hx + 26, hy + 2, 2, 14);
  ctx.fillRect(hx + 34, hy + 3, 2, 12);

  // Hair lighter highlights
  ctx.fillStyle = lightenColor(hairColor, 0.3);
  ctx.fillRect(hx + 10, hy + 4, 2, 8);
  ctx.fillRect(hx + 22, hy + 3, 2, 8);
  ctx.fillRect(hx + 32, hy + 5, 2, 6);

  if (dir === 1) {
    // Back view - hair covers everything
    ctx.fillStyle = hairColor;
    ctx.beginPath(); ctx.roundRect(hx - 4, hy - 2, 48, 30, 6); ctx.fill();
    // Redraw spikes on back
    ctx.beginPath(); ctx.moveTo(hx - 4, hy + 4); ctx.lineTo(hx - 12, hy - 8); ctx.lineTo(hx + 2, hy + 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 2, hy - 2); ctx.lineTo(hx + 5, hy - 16); ctx.lineTo(hx + 10, hy); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 7, hy - 2); ctx.lineTo(hx + 14, hy - 20); ctx.lineTo(hx + 19, hy - 1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 14, hy - 1); ctx.lineTo(hx + 20, hy - 18); ctx.lineTo(hx + 26, hy); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 22, hy - 1); ctx.lineTo(hx + 28, hy - 15); ctx.lineTo(hx + 34, hy); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 30, hy - 1); ctx.lineTo(hx + 36, hy - 12); ctx.lineTo(hx + 42, hy + 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 40, hy + 4); ctx.lineTo(hx + 50, hy - 6); ctx.lineTo(hx + 42, hy + 6); ctx.fill();
    // Back hair texture
    ctx.fillStyle = darkenColor(hairColor, 0.78);
    ctx.fillRect(hx + 8, hy + 6, 2, 18);
    ctx.fillRect(hx + 18, hy + 4, 2, 20);
    ctx.fillRect(hx + 28, hy + 6, 2, 18);
  } else {
    // Side hair drape
    if (dir === 2) {
      ctx.fillStyle = hairColor;
      ctx.fillRect(hx + 28, hy + 6, 10, 18);
      ctx.beginPath(); ctx.moveTo(hx + 38, hy + 10); ctx.lineTo(hx + 44, hy + 6); ctx.lineTo(hx + 38, hy + 18); ctx.fill();
    } else if (dir === 3) {
      ctx.fillStyle = hairColor;
      ctx.fillRect(hx + 2, hy + 6, 10, 18);
      ctx.beginPath(); ctx.moveTo(hx + 2, hy + 10); ctx.lineTo(hx - 4, hy + 6); ctx.lineTo(hx + 2, hy + 18); ctx.fill();
    } else {
      // Front - tapered side bangs that frame the face
      ctx.fillStyle = hairColor;
      // Left bang — tapered, thinner at bottom
      ctx.beginPath();
      ctx.moveTo(hx - 2, hy + 4);
      ctx.lineTo(hx - 4, hy + 10);
      ctx.lineTo(hx - 1, hy + 20);
      ctx.lineTo(hx + 3, hy + 16);
      ctx.lineTo(hx + 4, hy + 6);
      ctx.closePath(); ctx.fill();
      // Right bang — tapered
      ctx.beginPath();
      ctx.moveTo(hx + 42, hy + 4);
      ctx.lineTo(hx + 44, hy + 10);
      ctx.lineTo(hx + 41, hy + 20);
      ctx.lineTo(hx + 37, hy + 16);
      ctx.lineTo(hx + 36, hy + 6);
      ctx.closePath(); ctx.fill();
      // Front fringe across forehead (messy, overlaps slightly)
      ctx.fillStyle = darkenColor(hairColor, 0.88);
      ctx.beginPath();
      ctx.moveTo(hx + 2, hy + 6);
      ctx.lineTo(hx + 6, hy + 12);
      ctx.lineTo(hx + 10, hy + 8);
      ctx.lineTo(hx + 15, hy + 13);
      ctx.lineTo(hx + 20, hy + 9);
      ctx.lineTo(hx + 25, hy + 12);
      ctx.lineTo(hx + 30, hy + 8);
      ctx.lineTo(hx + 34, hy + 11);
      ctx.lineTo(hx + 38, hy + 6);
      ctx.lineTo(hx + 38, hy + 4);
      ctx.lineTo(hx + 2, hy + 4);
      ctx.closePath(); ctx.fill();
    }
  }

  // === FACE (only front and sides) ===
  const faceMarkColor = darkenColor(skin, 0.55);
  const noseBridgeColor = darkenColor(skin, 0.45);
  const mouthColor = darkenColor(skin, 0.7);
  if (dir !== 1) {
    if (dir === 0) {
      // Eyes - dark, intense
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(hx + 9, hy + 14, 7, 6);
      ctx.fillRect(hx + 24, hy + 14, 7, 6);
      // Pupils
      ctx.fillStyle = "#300";
      ctx.fillRect(hx + 11, hy + 15, 4, 4);
      ctx.fillRect(hx + 26, hy + 15, 4, 4);
      // Eye shine
      ctx.fillStyle = "#fff";
      ctx.fillRect(hx + 11, hy + 15, 2, 2);
      ctx.fillRect(hx + 26, hy + 15, 2, 2);

      // Under-eye markings
      ctx.fillStyle = faceMarkColor;
      ctx.fillRect(hx + 10, hy + 20, 6, 2);
      ctx.fillRect(hx + 25, hy + 20, 6, 2);
      // Nose bridge mark
      ctx.fillStyle = noseBridgeColor;
      ctx.fillRect(hx + 18, hy + 14, 4, 3);

      // Mouth
      ctx.fillStyle = mouthColor;
      ctx.fillRect(hx + 16, hy + 25, 8, 2);
    } else if (dir === 2) {
      // Left-facing eye
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(hx + 7, hy + 14, 7, 6);
      ctx.fillStyle = "#300";
      ctx.fillRect(hx + 8, hy + 15, 4, 4);
      ctx.fillStyle = "#fff";
      ctx.fillRect(hx + 8, hy + 15, 2, 2);
      // Mark
      ctx.fillStyle = faceMarkColor;
      ctx.fillRect(hx + 8, hy + 20, 5, 2);
      ctx.fillStyle = noseBridgeColor;
      ctx.fillRect(hx + 14, hy + 15, 3, 2);
      // Mouth
      ctx.fillStyle = mouthColor;
      ctx.fillRect(hx + 10, hy + 25, 6, 2);
    } else {
      // Right-facing eye
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(hx + 26, hy + 14, 7, 6);
      ctx.fillStyle = "#300";
      ctx.fillRect(hx + 27, hy + 15, 4, 4);
      ctx.fillStyle = "#fff";
      ctx.fillRect(hx + 27, hy + 15, 2, 2);
      // Mark
      ctx.fillStyle = faceMarkColor;
      ctx.fillRect(hx + 27, hy + 20, 5, 2);
      ctx.fillStyle = noseBridgeColor;
      ctx.fillRect(hx + 23, hy + 15, 3, 2);
      // Mouth
      ctx.fillStyle = mouthColor;
      ctx.fillRect(hx + 24, hy + 25, 6, 2);
    }
  }

  // === HELMET (tier-aware overlay on head) ===
  const helmetTier = (playerEquip.helmet && playerEquip.helmet.tier) || 0;
  if (helmetTier === 1) {
    // T1 Leather Cap — warm brown
    const tv = ARMOR_VISUALS[1];
    ctx.fillStyle = tv.primary;
    ctx.beginPath(); ctx.roundRect(hx + 2, hy - 2, 36, 12, 4); ctx.fill();
    ctx.fillStyle = tv.dark;
    ctx.fillRect(hx - 1, hy + 8, 42, 3);
    ctx.fillStyle = tv.secondary;
    ctx.fillRect(hx + 8, hy + 1, 24, 1);
  } else if (helmetTier === 2) {
    // T2 Iron Helm — steel grey-blue
    const tv = ARMOR_VISUALS[2];
    ctx.fillStyle = tv.primary;
    ctx.beginPath(); ctx.roundRect(hx + 1, hy - 4, 38, 14, 6); ctx.fill();
    ctx.fillStyle = tv.highlight;
    ctx.fillRect(hx + 1, hy + 6, 38, 3);
    if (dir === 0) {
      ctx.fillStyle = tv.primary;
      ctx.fillRect(hx + 17, hy + 9, 6, 8);
    }
    ctx.fillStyle = tv.accent;
    ctx.fillRect(hx + 4, hy + 7, 2, 2);
    ctx.fillRect(hx + 34, hy + 7, 2, 2);
  } else if (helmetTier === 3) {
    // T3 Warden Helm — dark green-grey full helm
    const tv = ARMOR_VISUALS[3];
    ctx.fillStyle = tv.primary;
    ctx.beginPath(); ctx.roundRect(hx, hy - 5, 40, 16, 6); ctx.fill();
    ctx.fillStyle = tv.secondary;
    ctx.fillRect(hx + 14, hy - 7, 12, 4);
    if (dir === 0) {
      ctx.fillStyle = "#1a1a1a";  // visor slit darkness
      ctx.fillRect(hx + 6, hy + 4, 28, 3);
      // Ember eye glow inside visor (brighter than default tier glow)
      const g = tv.glow.color;
      const eGlow = 0.4 + Math.sin(renderTime * tv.animSpeed) * 0.2;
      ctx.fillStyle = `rgba(${g[0]},${g[1]},${g[2]},${eGlow})`;
      ctx.fillRect(hx + 10, hy + 4, 4, 2);
      ctx.fillRect(hx + 26, hy + 4, 4, 2);
    }
    ctx.fillStyle = tv.dark;
    ctx.fillRect(hx, hy + 8, 5, 10);
    ctx.fillRect(hx + 35, hy + 8, 5, 10);
  } else if (helmetTier === 4) {
    // T4 Void Crown — black with purple crown spikes
    const tv = ARMOR_VISUALS[4];
    const vGlow = tierGlow(4, renderTime);
    const g = tv.glow.color;
    ctx.fillStyle = tv.primary;
    ctx.beginPath(); ctx.roundRect(hx + 1, hy - 4, 38, 14, 5); ctx.fill();
    // Crown spikes — dark with purple tips
    ctx.fillStyle = tv.secondary;
    ctx.beginPath(); ctx.moveTo(hx + 8, hy - 4); ctx.lineTo(hx + 12, hy - 14); ctx.lineTo(hx + 16, hy - 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 16, hy - 4); ctx.lineTo(hx + 20, hy - 18); ctx.lineTo(hx + 24, hy - 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 24, hy - 4); ctx.lineTo(hx + 28, hy - 14); ctx.lineTo(hx + 32, hy - 4); ctx.fill();
    // Purple glow on tips
    ctx.fillStyle = `rgba(${g[0]},${g[1]},${g[2]},${vGlow})`;
    ctx.beginPath(); ctx.arc(hx + 12, hy - 13, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 20, hy - 17, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 28, hy - 13, 3, 0, Math.PI * 2); ctx.fill();
    if (dir === 0) {
      const eg = tv.eyeGlow;
      ctx.fillStyle = `rgba(${eg[0]},${eg[1]},${eg[2]},${vGlow * 0.8})`;
      ctx.fillRect(hx + 9, hy + 4, 5, 3);
      ctx.fillRect(hx + 26, hy + 4, 5, 3);
    }
    ctx.fillStyle = `rgba(${g[0]},${g[1]},${g[2]},${vGlow * 0.5})`;
    ctx.fillRect(hx + 1, hy + 7, 38, 2);
  }
}

// === GENERIC NPC ===
function drawGenericChar(sx, sy, dir, frame, moving, skin, hair, shirt, pants, name, hp, mobType, boneSwing, castTimer) {
  const bobY = moving ? Math.sin(frame * Math.PI / 2) * 2.5 : 0;
  const legSwing = moving ? Math.sin(frame * Math.PI / 2) * 6 : 0;
  const armSwing = moving ? Math.sin(frame * Math.PI / 2) * 5 : 0;
  const x = sx - 20; let y = sy - 68;
  const isShooter = mobType === "shooter";
  const isPreview = mobType === "preview";
  const isSkeleton = mobType === "skeleton";
  const isWitch = mobType === "witch";
  const isGolem = mobType === "golem" || mobType === "mini_golem";
  const isMummy = mobType === "mummy";
  const isArcher = mobType === "archer";
  const isHealer = mobType === "healer";

  // Floor 1: Azurine City mob flags
  const isNeonPickpocket = mobType === 'neon_pickpocket';
  const isCyberMugger = mobType === 'cyber_mugger';
  const isDroneLookout = mobType === 'drone_lookout';
  const isStreetChemist = mobType === 'street_chemist';
  const isRenegadeBruiser = mobType === 'renegade_bruiser';
  const isShadowknife = mobType === 'renegade_shadowknife';
  const isRenegadeDemo = mobType === 'renegade_demo';
  const isRenegadeSniper = mobType === 'renegade_sniper';
  const isTheDon = mobType === 'the_don';
  const isVelocity = mobType === 'velocity';
  const isFloor1Mob = isNeonPickpocket || isCyberMugger || isDroneLookout || isStreetChemist || isRenegadeBruiser || isShadowknife || isRenegadeDemo || isRenegadeSniper || isTheDon || isVelocity;

  // Healer floats above ground
  if (isHealer && !isPreview) {
    const floatOff = -12 + Math.sin(renderTime * 0.003) * 5;
    y += floatOff;
    // Shadow on ground below
    const shadowScale = 0.7 + Math.sin(renderTime * 0.003) * 0.1;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath(); ctx.ellipse(sx, sy + 2, 16 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Legs
  ctx.fillStyle = pants;
  if (isGolem) {
    // Massive stone legs
    const legW = 14, legH = 18;
    ctx.fillStyle = "#5a5550";
    if (dir === 0 || dir === 1) {
      ctx.fillRect(x + 4, y + 44 + bobY - legSwing, legW, legH);
      ctx.fillRect(x + 22, y + 44 + bobY + legSwing, legW, legH);
    } else {
      ctx.fillRect(x + 8, y + 44 + bobY - legSwing, legW, legH);
      ctx.fillRect(x + 18, y + 44 + bobY + legSwing, legW, legH);
    }
    // Stone texture lines on legs
    ctx.strokeStyle = "#484440"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 10, y + 50 + bobY); ctx.lineTo(x + 16, y + 56 + bobY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 28, y + 50 + bobY); ctx.lineTo(x + 32, y + 54 + bobY); ctx.stroke();
    // Feet
    ctx.fillStyle = "#4a4540";
    ctx.fillRect(x + 2, y + 60 + bobY, legW + 2, 5);
    ctx.fillRect(x + 22, y + 60 + bobY, legW + 2, 5);
  } else if (isMummy) {
    // Mummy bandage-wrapped legs — dark body with grey wraps
    ctx.fillStyle = "#4a4650";
    if (dir === 0 || dir === 1) {
      ctx.fillRect(x + 10, y + 46 + bobY - legSwing, 8, 16);
      ctx.fillRect(x + 22, y + 46 + bobY + legSwing, 8, 16);
    } else {
      ctx.fillRect(x + 12, y + 46 + bobY - legSwing, 8, 16);
      ctx.fillRect(x + 20, y + 46 + bobY + legSwing, 8, 16);
    }
    // Bandage wraps on legs
    ctx.fillStyle = "#9a9590";
    const ly1 = y + 48 + bobY - legSwing, ly2 = y + 48 + bobY + legSwing;
    ctx.fillRect(x + 9, ly1 + 2, 10, 2);
    ctx.fillRect(x + 10, ly1 + 7, 9, 2);
    ctx.fillRect(x + 9, ly1 + 12, 10, 2);
    ctx.fillRect(x + 21, ly2 + 2, 10, 2);
    ctx.fillRect(x + 22, ly2 + 7, 9, 2);
    ctx.fillRect(x + 21, ly2 + 12, 10, 2);
  } else if (isArcher) {
    // Archer legs — black tattered wraps
    ctx.fillStyle = "#1a1a1a";
    if (dir === 0 || dir === 1) {
      ctx.fillRect(x + 9, y + 46 + bobY - legSwing, 9, 16);
      ctx.fillRect(x + 22, y + 46 + bobY + legSwing, 9, 16);
    } else {
      ctx.fillRect(x + 11, y + 46 + bobY - legSwing, 9, 16);
      ctx.fillRect(x + 20, y + 46 + bobY + legSwing, 9, 16);
    }
    // Dark wraps on shins
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(x + 8, y + 54 + bobY - legSwing, 11, 3);
    ctx.fillRect(x + 21, y + 54 + bobY + legSwing, 11, 3);
    ctx.fillRect(x + 9, y + 49 + bobY - legSwing, 9, 2);
    ctx.fillRect(x + 22, y + 49 + bobY + legSwing, 9, 2);
  } else if (isHealer) {
    // Healer floats — no legs visible, flowing robe bottom
    // Robe hangs down with wispy tattered ends
    ctx.fillStyle = "#ddd8cc";
    ctx.fillRect(x + 6, y + 46 + bobY, 28, 10);
    // Wispy tattered robe tips
    ctx.fillStyle = "#ccc8bb";
    ctx.fillRect(x + 4, y + 54 + bobY, 8, 6 + Math.sin(renderTime * 0.004) * 2);
    ctx.fillRect(x + 14, y + 55 + bobY, 6, 5 + Math.sin(renderTime * 0.005 + 1) * 2);
    ctx.fillRect(x + 24, y + 54 + bobY, 8, 6 + Math.sin(renderTime * 0.004 + 2) * 2);
    // Gold trim at bottom
    ctx.fillStyle = "#c8a848";
    ctx.fillRect(x + 5, y + 53 + bobY, 30, 2);
  } else if (isSkeleton) {
    // Thin bony legs
    if (dir === 0 || dir === 1) {
      ctx.fillRect(x + 10, y + 46 + bobY - legSwing, 5, 14);
      ctx.fillRect(x + 25, y + 46 + bobY + legSwing, 5, 14);
    } else {
      ctx.fillRect(x + 13, y + 46 + bobY - legSwing, 5, 14);
      ctx.fillRect(x + 22, y + 46 + bobY + legSwing, 5, 14);
    }
    // Bony feet
    ctx.fillStyle = "#c8c0b0";
    if (dir === 0 || dir === 1) {
      ctx.fillRect(x + 8, y + 58 + bobY - legSwing * 0.3, 9, 4);
      ctx.fillRect(x + 23, y + 58 + bobY + legSwing * 0.3, 9, 4);
    } else {
      ctx.fillRect(x + 11, y + 58 + bobY - legSwing * 0.3, 8, 4);
      ctx.fillRect(x + 21, y + 58 + bobY + legSwing * 0.3, 8, 4);
    }
  } else if (isRenegadeBruiser) {
    // Extra-wide armored legs
    ctx.fillStyle = "#3a2a2a";
    if (dir === 0 || dir === 1) {
      ctx.fillRect(x + 3, y + 44 + bobY - legSwing, 13, 16);
      ctx.fillRect(x + 24, y + 44 + bobY + legSwing, 13, 16);
    } else {
      ctx.fillRect(x + 7, y + 44 + bobY - legSwing, 12, 16);
      ctx.fillRect(x + 21, y + 44 + bobY + legSwing, 12, 16);
    }
    // Metal knee guards
    ctx.fillStyle = "#5a4a4a";
    ctx.fillRect(x + 5, y + 50 + bobY - legSwing, 9, 4);
    ctx.fillRect(x + 26, y + 50 + bobY + legSwing, 9, 4);
    // Heavy boots
    ctx.fillStyle = "#2a1a1a";
    ctx.fillRect(x + 2, y + 58 + bobY, 14, 5);
    ctx.fillRect(x + 24, y + 58 + bobY, 14, 5);
  } else if (isShadowknife) {
    // Thin wrapped legs
    ctx.fillStyle = "#0a0a1a";
    if (dir === 0 || dir === 1) {
      ctx.fillRect(x + 10, y + 46 + bobY - legSwing, 7, 14);
      ctx.fillRect(x + 23, y + 46 + bobY + legSwing, 7, 14);
    } else {
      ctx.fillRect(x + 12, y + 46 + bobY - legSwing, 7, 14);
      ctx.fillRect(x + 21, y + 46 + bobY + legSwing, 7, 14);
    }
    // Wrapping strips
    ctx.fillStyle = "#1a1a2a";
    ctx.fillRect(x + 9, y + 49 + bobY - legSwing, 9, 2);
    ctx.fillRect(x + 22, y + 52 + bobY + legSwing, 9, 2);
  } else if (isFloor1Mob) {
    // Default Floor 1 legs — use defined pants color
    if (dir === 0 || dir === 1) {
      ctx.fillRect(x + 6, y + 46 + bobY - legSwing, 10, 14);
      ctx.fillRect(x + 24, y + 46 + bobY + legSwing, 10, 14);
    } else {
      ctx.fillRect(x + 10, y + 46 + bobY - legSwing, 9, 14);
      ctx.fillRect(x + 21, y + 46 + bobY + legSwing, 9, 14);
    }
    // Neon pickpocket: cyan stripe on legs
    if (isNeonPickpocket) {
      ctx.fillStyle = "#00ccff";
      ctx.fillRect(x + 14, y + 48 + bobY - legSwing, 2, 10);
      ctx.fillRect(x + 24, y + 48 + bobY + legSwing, 2, 10);
    }
    // Renegade demo: ammo pouches on thigh
    if (isRenegadeDemo) {
      ctx.fillStyle = "#6a5a4a";
      ctx.fillRect(x + 4, y + 48 + bobY - legSwing, 4, 6);
    }
    // The Don: polished shoes
    if (isTheDon) {
      ctx.fillStyle = "#1a0a00";
      ctx.fillRect(x + 4, y + 58 + bobY, 12, 4);
      ctx.fillRect(x + 24, y + 58 + bobY, 12, 4);
    }
    // Velocity: blue energy lines on legs
    if (isVelocity) {
      const pulse = 0.5 + 0.5 * Math.sin(renderTime * 0.008);
      ctx.fillStyle = `rgba(60,60,255,${0.4 + pulse * 0.4})`;
      ctx.fillRect(x + 8, y + 47 + bobY - legSwing, 2, 12);
      ctx.fillRect(x + 30, y + 47 + bobY + legSwing, 2, 12);
    }
  } else {
  if (dir === 0 || dir === 1) {
    ctx.fillRect(x + 6, y + 46 + bobY - legSwing, 10, 14);
    ctx.fillRect(x + 24, y + 46 + bobY + legSwing, 10, 14);
  } else {
    ctx.fillRect(x + 10, y + 46 + bobY - legSwing, 9, 14);
    ctx.fillRect(x + 21, y + 46 + bobY + legSwing, 9, 14);
  }
  ctx.fillStyle = "#3a2a18";
  if (dir === 0 || dir === 1) {
    ctx.fillRect(x + 4, y + 58 + bobY - legSwing * 0.3, 13, 6);
    ctx.fillRect(x + 23, y + 58 + bobY + legSwing * 0.3, 13, 6);
  } else {
    ctx.fillRect(x + 8, y + 58 + bobY - legSwing * 0.3, 12, 6);
    ctx.fillRect(x + 20, y + 58 + bobY + legSwing * 0.3, 12, 6);
  }
  }

  // Body
  ctx.fillStyle = shirt;
  if (isGolem) {
    // Massive stone torso
    ctx.fillStyle = "#6a6560";
    ctx.beginPath(); ctx.roundRect(x + 0, y + 22 + bobY, 40, 26, 4); ctx.fill();
    // Stone texture
    ctx.fillStyle = "#5a5550";
    ctx.fillRect(x + 4, y + 30 + bobY, 14, 8);
    ctx.fillRect(x + 22, y + 26 + bobY, 12, 10);
    // Crack lines
    ctx.strokeStyle = "#484440"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 10, y + 24 + bobY); ctx.lineTo(x + 18, y + 38 + bobY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 28, y + 26 + bobY); ctx.lineTo(x + 22, y + 42 + bobY); ctx.stroke();
    // Glowing core
    const t = renderTime / 400;
    const coreGlow = 0.4 + 0.2 * Math.sin(t);
    ctx.fillStyle = `rgba(255,140,40,${coreGlow})`;
    ctx.beginPath(); ctx.arc(x + 20, y + 35 + bobY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,200,80,${coreGlow * 0.5})`;
    ctx.beginPath(); ctx.arc(x + 20, y + 35 + bobY, 9, 0, Math.PI * 2); ctx.fill();
  } else if (isMummy) {
    // Dark body with bandage wraps
    ctx.fillStyle = "#4a4650";
    ctx.fillRect(x + 4, y + 28 + bobY, 32, 20);
    // Bandage diagonal wraps across torso
    ctx.fillStyle = "#9a9590";
    ctx.save();
    ctx.translate(x + 20, y + 38 + bobY);
    ctx.rotate(-0.3);
    ctx.fillRect(-14, -6, 28, 3);
    ctx.fillRect(-12, 0, 26, 3);
    ctx.fillRect(-14, 6, 28, 3);
    ctx.restore();
    // Cross wrap
    ctx.fillStyle = "#8a8580";
    ctx.save();
    ctx.translate(x + 20, y + 38 + bobY);
    ctx.rotate(0.4);
    ctx.fillRect(-10, -3, 22, 2);
    ctx.restore();
  } else if (isArcher) {
    // Black tattered cloak body
    ctx.fillStyle = "#111111";
    ctx.fillRect(x + 3, y + 26 + bobY, 34, 22);
    // Tattered cloak edges hanging down
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(x + 0, y + 44 + bobY, 7, 8);
    ctx.fillRect(x + 10, y + 46 + bobY, 5, 6);
    ctx.fillRect(x + 24, y + 46 + bobY, 5, 6);
    ctx.fillRect(x + 32, y + 44 + bobY, 7, 8);
    // Dark leather belt
    ctx.fillStyle = "#2a2018";
    ctx.fillRect(x + 4, y + 40 + bobY, 32, 3);
    // Buckle
    ctx.fillStyle = "#4a4a3a";
    ctx.fillRect(x + 18, y + 40 + bobY, 4, 3);
    // Arrow quiver on back (dark leather)
    if (dir === 0 || dir === 2 || dir === 3) {
      ctx.fillStyle = "#1a1410";
      ctx.fillRect(x + 28, y + 20 + bobY, 7, 22);
      // Arrow tips poking out — dark shafts, green tips
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(x + 29, y + 16 + bobY, 2, 6);
      ctx.fillRect(x + 32, y + 17 + bobY, 2, 5);
      ctx.fillStyle = "#40aa30";
      ctx.fillRect(x + 29, y + 14 + bobY, 2, 3);
      ctx.fillRect(x + 32, y + 15 + bobY, 2, 3);
    }
    // Shoulder guards
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x + 1, y + 26 + bobY, 8, 6);
    ctx.fillRect(x + 30, y + 26 + bobY, 8, 6);
    // Dark trim
    ctx.fillStyle = "#222";
    ctx.fillRect(x + 3, y + 26 + bobY, 34, 2);
  } else if (isHealer) {
    // Healer body — white/cream robes with gold accents
    ctx.fillStyle = "#eee8dd";
    ctx.fillRect(x + 3, y + 26 + bobY, 34, 22);
    // Flowing robe edges
    ctx.fillStyle = "#ddd8cc";
    ctx.fillRect(x + 0, y + 44 + bobY, 8, 7);
    ctx.fillRect(x + 14, y + 46 + bobY, 6, 5);
    ctx.fillRect(x + 32, y + 44 + bobY, 8, 7);
    // Gold sash across chest
    ctx.fillStyle = "#c8a848";
    ctx.save();
    ctx.translate(x + 20, y + 36 + bobY);
    ctx.rotate(-0.25);
    ctx.fillRect(-16, -2, 32, 4);
    ctx.restore();
    // Gold belt
    ctx.fillStyle = "#b89838";
    ctx.fillRect(x + 5, y + 41 + bobY, 30, 3);
    // Glowing crystal/orb on chest
    ctx.fillStyle = "#ffee60";
    ctx.beginPath(); ctx.arc(x + 20, y + 34 + bobY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,238,100,0.3)";
    ctx.beginPath(); ctx.arc(x + 20, y + 34 + bobY, 8, 0, Math.PI * 2); ctx.fill();
    // Shoulder pads
    ctx.fillStyle = "#c8a848";
    ctx.fillRect(x + 1, y + 26 + bobY, 8, 5);
    ctx.fillRect(x + 31, y + 26 + bobY, 8, 5);
  } else if (isSkeleton) {
    // Rib lines
    ctx.fillStyle = "#b0a890";
    for (let r = 0; r < 3; r++) ctx.fillRect(x + 10, y + 31 + bobY + r * 5, 20, 1);
  } else if (isFloor1Mob) {
    // --- Floor 1 torso rendering ---
    if (isNeonPickpocket) {
      // Dark hoodie body with cyan trim
      ctx.fillStyle = "#1a1a3a";
      ctx.fillRect(x + 4, y + 28 + bobY, 32, 20);
      // Hoodie pocket
      ctx.fillStyle = "#141430";
      ctx.fillRect(x + 10, y + 38 + bobY, 20, 8);
      // Cyan trim lines
      ctx.fillStyle = "#00ccff";
      ctx.fillRect(x + 4, y + 28 + bobY, 32, 2); // collar
      ctx.fillRect(x + 19, y + 30 + bobY, 2, 16); // center zipper
      // Faint cyan glow on hoodie
      ctx.fillStyle = "rgba(0,204,255,0.08)";
      ctx.fillRect(x + 4, y + 28 + bobY, 32, 20);
    } else if (isCyberMugger) {
      // Dark tactical vest with armor plates
      ctx.fillStyle = "#2a2a3a";
      ctx.fillRect(x + 4, y + 28 + bobY, 32, 20);
      // Armor plate highlights
      ctx.fillStyle = "#3a3a4a";
      ctx.fillRect(x + 6, y + 30 + bobY, 12, 8);
      ctx.fillRect(x + 22, y + 30 + bobY, 12, 8);
      // Plate edges
      ctx.fillStyle = "#4a4a5a";
      ctx.fillRect(x + 6, y + 30 + bobY, 12, 1);
      ctx.fillRect(x + 22, y + 30 + bobY, 12, 1);
      // Utility belt
      ctx.fillStyle = "#3a3020";
      ctx.fillRect(x + 4, y + 42 + bobY, 32, 3);
      ctx.fillStyle = "#5a5040"; // buckle
      ctx.fillRect(x + 18, y + 42 + bobY, 4, 3);
    } else if (isDroneLookout) {
      // Light tactical vest with tech harness
      ctx.fillStyle = "#4a4a5a";
      ctx.fillRect(x + 4, y + 28 + bobY, 32, 20);
      // Tech harness straps
      ctx.fillStyle = "#3a3a4a";
      ctx.fillRect(x + 14, y + 28 + bobY, 3, 18); // center strap
      ctx.fillRect(x + 23, y + 28 + bobY, 3, 18); // right strap
      // Receiver module on chest
      ctx.fillStyle = "#2a2a3a";
      ctx.fillRect(x + 10, y + 32 + bobY, 8, 6);
      // Red indicator light (blinks)
      const blink = Math.sin(renderTime * 0.005) > 0;
      if (blink) {
        ctx.fillStyle = "#ff3030";
        ctx.fillRect(x + 12, y + 34 + bobY, 3, 3);
        ctx.fillStyle = "rgba(255,48,48,0.3)";
        ctx.beginPath(); ctx.arc(x + 13, y + 35 + bobY, 5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (isStreetChemist) {
      // Stained lab coat
      ctx.fillStyle = "#5a6a4a";
      ctx.fillRect(x + 2, y + 28 + bobY, 36, 22);
      // Green acid stains
      ctx.fillStyle = "#4a6a2a";
      ctx.fillRect(x + 8, y + 34 + bobY, 5, 4);
      ctx.fillRect(x + 24, y + 38 + bobY, 6, 3);
      // Coat opening
      ctx.fillStyle = "#3a4a2a";
      ctx.fillRect(x + 18, y + 30 + bobY, 3, 18);
      // Vial holder belt
      ctx.fillStyle = "#3a3020";
      ctx.fillRect(x + 4, y + 44 + bobY, 32, 3);
      // Tiny vials on belt
      ctx.fillStyle = "#60ff40";
      ctx.fillRect(x + 8, y + 42 + bobY, 2, 4);
      ctx.fillRect(x + 13, y + 42 + bobY, 2, 4);
      ctx.fillStyle = "#ff6040";
      ctx.fillRect(x + 26, y + 42 + bobY, 2, 4);
    } else if (isRenegadeBruiser) {
      // Heavy plate armor
      ctx.fillStyle = "#4a3a3a";
      ctx.fillRect(x + 2, y + 26 + bobY, 36, 22);
      // Chest plate highlight
      ctx.fillStyle = "#5a4a4a";
      ctx.fillRect(x + 6, y + 28 + bobY, 28, 12);
      // Red gang stripe across chest
      ctx.fillStyle = "#cc2020";
      ctx.fillRect(x + 4, y + 34 + bobY, 32, 3);
      // Spiked shoulder pads
      ctx.fillStyle = "#3a2a2a";
      ctx.fillRect(x + 0, y + 26 + bobY, 10, 8);
      ctx.fillRect(x + 30, y + 26 + bobY, 10, 8);
      // Spikes
      ctx.fillStyle = "#5a4a4a";
      ctx.fillRect(x - 1, y + 24 + bobY, 3, 4);
      ctx.fillRect(x + 5, y + 24 + bobY, 3, 4);
      ctx.fillRect(x + 32, y + 24 + bobY, 3, 4);
      ctx.fillRect(x + 38, y + 24 + bobY, 3, 4);
    } else if (isShadowknife) {
      // Slim dark stealth suit
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(x + 6, y + 28 + bobY, 28, 20);
      // Subtle purple trim
      ctx.fillStyle = "rgba(100,40,140,0.4)";
      ctx.fillRect(x + 6, y + 28 + bobY, 28, 2);
      ctx.fillRect(x + 6, y + 46 + bobY, 28, 2);
      // Cross-body sheath strap
      ctx.fillStyle = "#1a1a2a";
      ctx.save();
      ctx.translate(x + 20, y + 38 + bobY);
      ctx.rotate(-0.35);
      ctx.fillRect(-16, -1, 32, 2);
      ctx.restore();
    } else if (isRenegadeDemo) {
      // Tactical vest with explosive pouches
      ctx.fillStyle = "#5a4a3a";
      ctx.fillRect(x + 4, y + 28 + bobY, 32, 20);
      // Bandolier across chest
      ctx.fillStyle = "#3a3020";
      ctx.save();
      ctx.translate(x + 20, y + 36 + bobY);
      ctx.rotate(-0.3);
      ctx.fillRect(-16, -2, 32, 4);
      ctx.restore();
      // Explosive pouches (orange dots = charges)
      ctx.fillStyle = "#ff6030";
      ctx.beginPath(); ctx.arc(x + 10, y + 34 + bobY, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 18, y + 33 + bobY, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 26, y + 34 + bobY, 3, 0, Math.PI * 2); ctx.fill();
      // Orange caps on charges
      ctx.fillStyle = "#cc4020";
      ctx.beginPath(); ctx.arc(x + 10, y + 34 + bobY, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 18, y + 33 + bobY, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 26, y + 34 + bobY, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (isRenegadeSniper) {
      // Long dark coat
      ctx.fillStyle = "#3a3a4a";
      ctx.fillRect(x + 2, y + 28 + bobY, 36, 24);
      // Coat lapels
      ctx.fillStyle = "#2a2a3a";
      ctx.fillRect(x + 8, y + 28 + bobY, 8, 10);
      ctx.fillRect(x + 24, y + 28 + bobY, 8, 10);
      // Inner shirt
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(x + 16, y + 30 + bobY, 8, 8);
      // Coat flare bottom
      ctx.fillStyle = "#2a2a3a";
      ctx.fillRect(x + 0, y + 48 + bobY, 8, 6);
      ctx.fillRect(x + 32, y + 48 + bobY, 8, 6);
    } else if (isTheDon) {
      // Pinstripe suit jacket
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(x + 2, y + 26 + bobY, 36, 22);
      // Pinstripes
      ctx.fillStyle = "#4a3a2a";
      for (let s = 0; s < 7; s++) {
        ctx.fillRect(x + 4 + s * 5, y + 26 + bobY, 1, 22);
      }
      // Lapels
      ctx.fillStyle = "#2a1a0a";
      ctx.fillRect(x + 8, y + 26 + bobY, 7, 12);
      ctx.fillRect(x + 25, y + 26 + bobY, 7, 12);
      // White shirt V
      ctx.fillStyle = "#c8c0b0";
      ctx.beginPath();
      ctx.moveTo(x + 15, y + 26 + bobY);
      ctx.lineTo(x + 20, y + 36 + bobY);
      ctx.lineTo(x + 25, y + 26 + bobY);
      ctx.closePath();
      ctx.fill();
      // Tie
      ctx.fillStyle = "#cc2020";
      ctx.fillRect(x + 19, y + 28 + bobY, 3, 14);
      // Gold chain across vest
      ctx.fillStyle = "#ffd700";
      ctx.fillRect(x + 12, y + 38 + bobY, 16, 1);
      // Wide shoulders
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(x + 0, y + 26 + bobY, 6, 8);
      ctx.fillRect(x + 34, y + 26 + bobY, 6, 8);
    } else if (isVelocity) {
      // Sleek streamlined armor
      ctx.fillStyle = "#2a2a5a";
      ctx.fillRect(x + 4, y + 28 + bobY, 32, 20);
      // Energy core in center chest
      const pulse = 0.5 + 0.5 * Math.sin(renderTime * 0.008);
      ctx.fillStyle = `rgba(60,60,255,${0.6 + pulse * 0.3})`;
      ctx.beginPath(); ctx.arc(x + 20, y + 36 + bobY, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(100,100,255,${0.3 + pulse * 0.2})`;
      ctx.beginPath(); ctx.arc(x + 20, y + 36 + bobY, 9, 0, Math.PI * 2); ctx.fill();
      // Blue energy lines on torso
      ctx.fillStyle = `rgba(80,80,255,${0.4 + pulse * 0.4})`;
      ctx.fillRect(x + 8, y + 30 + bobY, 2, 16);
      ctx.fillRect(x + 30, y + 30 + bobY, 2, 16);
      ctx.fillRect(x + 10, y + 28 + bobY, 20, 2);
      // Lightning crackling around body
      if (Math.random() < 0.3) {
        ctx.strokeStyle = "rgba(120,120,255,0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const lx = x + 10 + Math.random() * 20;
        const ly = y + 28 + bobY + Math.random() * 18;
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + (Math.random() - 0.5) * 12, ly + (Math.random() - 0.5) * 12);
        ctx.stroke();
      }
    }
  } else {
    ctx.fillRect(x + 4, y + 28 + bobY, 32, 20);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(x + 4, y + 40 + bobY, 32, 8);
  }

  // Arms
  const drawArm = (ax, ay) => {
    if (isSkeleton) {
      // Thin bony arms
      ctx.fillStyle = skin; ctx.fillRect(ax + 1, ay, 5, 6);
      ctx.fillStyle = skin; ctx.fillRect(ax + 1, ay + 5, 4, 12);
      ctx.fillRect(ax + 2, ay + 15, 3, 3);
    } else {
    ctx.fillStyle = shirt; ctx.fillRect(ax, ay, 7, 8);
    ctx.fillStyle = skin; ctx.fillRect(ax, ay + 7, 7, 12);
    ctx.fillRect(ax + 1, ay + 17, 6, 4);
    }
  };
  // Mini rifle for shooters
  const drawMiniGun = (gx, gy, gDir) => {
    const m1 = "#3a3a40", m2 = "#2e2e32", wd = "#3a2a18";
    if (gDir === 2) { // LEFT
      ctx.fillStyle = wd; ctx.fillRect(gx + 4, gy, 8, 5);
      ctx.fillStyle = m1; ctx.fillRect(gx - 8, gy - 1, 14, 6);
      ctx.fillStyle = m2; ctx.fillRect(gx - 20, gy, 12, 4);
      ctx.fillStyle = "#1a1a1a"; ctx.fillRect(gx - 24, gy - 1, 5, 6);
    } else if (gDir === 3) { // RIGHT
      ctx.fillStyle = wd; ctx.fillRect(gx - 12, gy, 8, 5);
      ctx.fillStyle = m1; ctx.fillRect(gx - 6, gy - 1, 14, 6);
      ctx.fillStyle = m2; ctx.fillRect(gx + 8, gy, 12, 4);
      ctx.fillStyle = "#1a1a1a"; ctx.fillRect(gx + 19, gy - 1, 5, 6);
    } else if (gDir === 0) { // DOWN
      ctx.fillStyle = wd; ctx.fillRect(gx - 2, gy - 10, 5, 8);
      ctx.fillStyle = m1; ctx.fillRect(gx - 3, gy - 2, 6, 14);
      ctx.fillStyle = m2; ctx.fillRect(gx - 2, gy + 12, 4, 12);
      ctx.fillStyle = "#1a1a1a"; ctx.fillRect(gx - 3, gy + 22, 6, 5);
    } else { // UP
      ctx.fillStyle = wd; ctx.fillRect(gx - 2, gy + 2, 5, 8);
      ctx.fillStyle = m1; ctx.fillRect(gx - 3, gy - 12, 6, 14);
      ctx.fillStyle = m2; ctx.fillRect(gx - 2, gy - 24, 4, 12);
      ctx.fillStyle = "#1a1a1a"; ctx.fillRect(gx - 3, gy - 27, 6, 5);
    }
  };
  // Bone weapon for skeletons
  const drawBone = (bx, by, bDir) => {
    const bone = "#e8e0d0", boneD = "#c8c0b0", joint = "#ddd8cc";
    if (bDir === 2) { // LEFT
      ctx.fillStyle = bone; ctx.fillRect(bx - 20, by - 1, 22, 3);
      ctx.fillStyle = joint; ctx.beginPath(); ctx.arc(bx - 20, by, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = boneD; ctx.beginPath(); ctx.arc(bx + 2, by, 2, 0, Math.PI * 2); ctx.fill();
    } else if (bDir === 3) { // RIGHT
      ctx.fillStyle = bone; ctx.fillRect(bx - 2, by - 1, 22, 3);
      ctx.fillStyle = joint; ctx.beginPath(); ctx.arc(bx + 20, by, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = boneD; ctx.beginPath(); ctx.arc(bx - 2, by, 2, 0, Math.PI * 2); ctx.fill();
    } else if (bDir === 0) { // DOWN
      ctx.fillStyle = bone; ctx.fillRect(bx - 1, by - 2, 3, 22);
      ctx.fillStyle = joint; ctx.beginPath(); ctx.arc(bx, by + 20, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = boneD; ctx.beginPath(); ctx.arc(bx, by - 2, 2, 0, Math.PI * 2); ctx.fill();
    } else { // UP
      ctx.fillStyle = bone; ctx.fillRect(bx - 1, by - 20, 3, 22);
      ctx.fillStyle = joint; ctx.beginPath(); ctx.arc(bx, by - 20, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = boneD; ctx.beginPath(); ctx.arc(bx, by + 2, 2, 0, Math.PI * 2); ctx.fill();
    }
  };

  if (isShooter && !isPreview) {
    // Gun arm + free arm based on direction
    const armY = y + 35 + bobY;
    if (dir === 0) {
      drawArm(x - 3, y + 29 + bobY + armSwing);
      ctx.fillStyle = shirt; ctx.fillRect(x + 33, y + 30 + bobY, 7, 8);
      ctx.fillStyle = skin; ctx.fillRect(x + 34, armY, 5, 5);
      drawMiniGun(x + 36, armY + 4, 0);
    } else if (dir === 1) {
      drawArm(x + 36, y + 29 + bobY - armSwing);
      ctx.fillStyle = shirt; ctx.fillRect(x - 1, y + 30 + bobY, 7, 8);
      ctx.fillStyle = skin; ctx.fillRect(x, y + 29 + bobY, 5, 5);
      drawMiniGun(x + 2, y + 27 + bobY, 1);
    } else if (dir === 2) {
      drawArm(x + 12, y + 29 + bobY - armSwing);
      ctx.fillStyle = shirt; ctx.fillRect(x + 4, armY - 2, 10, 7);
      ctx.fillStyle = skin; ctx.fillRect(x, armY - 1, 5, 5);
      drawMiniGun(x - 2, armY, 2);
    } else {
      drawArm(x - 2, y + 29 + bobY + armSwing);
      ctx.fillStyle = shirt; ctx.fillRect(x + 26, armY - 4, 10, 7);
      ctx.fillStyle = skin; ctx.fillRect(x + 35, armY - 3, 5, 5);
      drawMiniGun(x + 38, armY - 2, 3);
    }
  } else if (isSkeleton && !isPreview) {
    // Skeleton with bone weapon in one hand — animated swing on attack
    const armY = y + 35 + bobY;
    const swinging = boneSwing > 0;
    const swingProgress = swinging ? 1 - (boneSwing / 20) : 0;
    const swingAngle = swinging ? (swingProgress - 0.5) * 2.5 : 0;

    if (dir === 0) {
      drawArm(x - 3, y + 29 + bobY + armSwing);
      drawArm(x + 33, y + 30 + bobY);
      ctx.fillStyle = skin; ctx.fillRect(x + 34, armY, 5, 5);
      ctx.save(); ctx.translate(x + 36, armY + 4); ctx.rotate(swingAngle);
      drawBone(0, 0, 0); ctx.restore();
    } else if (dir === 1) {
      drawArm(x + 36, y + 29 + bobY - armSwing);
      drawArm(x - 1, y + 30 + bobY);
      ctx.fillStyle = skin; ctx.fillRect(x, y + 29 + bobY, 5, 5);
      ctx.save(); ctx.translate(x + 2, y + 27 + bobY); ctx.rotate(swingAngle);
      drawBone(0, 0, 1); ctx.restore();
    } else if (dir === 2) {
      drawArm(x + 12, y + 29 + bobY - armSwing);
      drawArm(x + 4, armY - 2);
      ctx.fillStyle = skin; ctx.fillRect(x, armY - 1, 5, 5);
      ctx.save(); ctx.translate(x - 2, armY); ctx.rotate(swingAngle);
      drawBone(0, 0, 2); ctx.restore();
    } else {
      drawArm(x - 2, y + 29 + bobY + armSwing);
      drawArm(x + 26, armY - 4);
      ctx.fillStyle = skin; ctx.fillRect(x + 35, armY - 3, 5, 5);
      ctx.save(); ctx.translate(x + 38, armY - 2); ctx.rotate(-swingAngle);
      drawBone(0, 0, 3); ctx.restore();
    }
    // Swing trail effect
    if (swinging) {
      const trailAlpha = 0.5 * (1 - swingProgress);
      ctx.strokeStyle = `rgba(220,210,190,${trailAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (dir === 2) { ctx.moveTo(x - 4, armY - 10); ctx.lineTo(x - 24, armY + 8); }
      else if (dir === 3) { ctx.moveTo(x + 40, armY - 10); ctx.lineTo(x + 60, armY + 8); }
      else if (dir === 0) { ctx.moveTo(x + 26, armY + 6); ctx.lineTo(x + 40, armY + 26); }
      else { ctx.moveTo(x + 10, armY - 30); ctx.lineTo(x - 4, armY - 14); }
      ctx.stroke();
    }
  } else if (isGolem && !isPreview) {
    // Golem massive stone arms with throw animation
    const isThrowing = (castTimer > 0); // reuse castTimer for throwAnim
    const throwProgress = isThrowing ? 1 - (castTimer / 30) : 0;

    const drawGolemArm = (ax, ay) => {
      ctx.fillStyle = "#6a6560";
      ctx.fillRect(ax, ay, 10, 10); // shoulder
      ctx.fillStyle = "#5a5550";
      ctx.fillRect(ax + 1, ay + 9, 9, 14); // forearm
      // Fist
      ctx.fillStyle = "#7a7570";
      ctx.beginPath(); ctx.roundRect(ax, ay + 21, 11, 8, 3); ctx.fill();
    };

    if (dir === 2) {
      drawGolemArm(x - 6, y + 24 + bobY);
      if (isThrowing) {
        // Raise arm up then swing forward
        const armRaise = Math.sin(throwProgress * Math.PI) * 20;
        ctx.fillStyle = "#6a6560";
        ctx.fillRect(x + 34, y + 24 + bobY - armRaise, 10, 10);
        ctx.fillStyle = "#5a5550";
        ctx.fillRect(x + 35, y + 33 + bobY - armRaise, 9, 14);
      } else {
        drawGolemArm(x + 34, y + 24 + bobY);
      }
    } else if (dir === 3) {
      drawGolemArm(x + 34, y + 24 + bobY);
      if (isThrowing) {
        const armRaise = Math.sin(throwProgress * Math.PI) * 20;
        ctx.fillStyle = "#6a6560";
        ctx.fillRect(x - 6, y + 24 + bobY - armRaise, 10, 10);
        ctx.fillStyle = "#5a5550";
        ctx.fillRect(x - 5, y + 33 + bobY - armRaise, 9, 14);
      } else {
        drawGolemArm(x - 6, y + 24 + bobY);
      }
    } else {
      const armRaise = isThrowing ? Math.sin(throwProgress * Math.PI) * 18 : 0;
      drawGolemArm(x - 6, y + 24 + bobY + (isThrowing ? armSwing : armSwing));
      drawGolemArm(x + 34, y + 24 + bobY - armRaise);
    }
    // Throw windup glow
    if (isThrowing && throwProgress < 0.5) {
      ctx.fillStyle = `rgba(255,160,60,${0.5 * (1 - throwProgress * 2)})`;
      ctx.beginPath(); ctx.arc(x + 20, y + 20 + bobY, 14, 0, Math.PI * 2); ctx.fill();
    }
  } else if (isWitch && !isPreview) {
    // Witch with wand — casting animation when castTimer > 0
    const isCasting = castTimer > 0;
    const castProgress = isCasting ? 1 - (castTimer / 40) : 0;
    const wandBob = isCasting ? Math.sin(castProgress * Math.PI * 4) * 8 : 0;

    const drawWand = (wx, wy, wDir) => {
      const wandLen = 26;
      ctx.strokeStyle = "#4a2a18"; ctx.lineWidth = 3;
      if (wDir === 2) { // LEFT
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx - wandLen, wy - 10 + wandBob); ctx.stroke();
        ctx.fillStyle = "#a060e0"; ctx.beginPath(); ctx.arc(wx - wandLen, wy - 10 + wandBob, 4, 0, Math.PI * 2); ctx.fill();
        if (isCasting) { ctx.fillStyle = `rgba(180,100,255,${0.6 * (1-castProgress)})`; ctx.beginPath(); ctx.arc(wx - wandLen, wy - 10 + wandBob, 8 + castProgress * 6, 0, Math.PI * 2); ctx.fill(); }
      } else if (wDir === 3) { // RIGHT
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + wandLen, wy - 10 + wandBob); ctx.stroke();
        ctx.fillStyle = "#a060e0"; ctx.beginPath(); ctx.arc(wx + wandLen, wy - 10 + wandBob, 4, 0, Math.PI * 2); ctx.fill();
        if (isCasting) { ctx.fillStyle = `rgba(180,100,255,${0.6 * (1-castProgress)})`; ctx.beginPath(); ctx.arc(wx + wandLen, wy - 10 + wandBob, 8 + castProgress * 6, 0, Math.PI * 2); ctx.fill(); }
      } else if (wDir === 0) { // DOWN
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 6, wy + wandLen + wandBob); ctx.stroke();
        ctx.fillStyle = "#a060e0"; ctx.beginPath(); ctx.arc(wx + 6, wy + wandLen + wandBob, 4, 0, Math.PI * 2); ctx.fill();
        if (isCasting) { ctx.fillStyle = `rgba(180,100,255,${0.6 * (1-castProgress)})`; ctx.beginPath(); ctx.arc(wx + 6, wy + wandLen + wandBob, 8 + castProgress * 6, 0, Math.PI * 2); ctx.fill(); }
      } else { // UP
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx - 4, wy - wandLen + wandBob); ctx.stroke();
        ctx.fillStyle = "#a060e0"; ctx.beginPath(); ctx.arc(wx - 4, wy - wandLen + wandBob, 4, 0, Math.PI * 2); ctx.fill();
        if (isCasting) { ctx.fillStyle = `rgba(180,100,255,${0.6 * (1-castProgress)})`; ctx.beginPath(); ctx.arc(wx - 4, wy - wandLen + wandBob, 8 + castProgress * 6, 0, Math.PI * 2); ctx.fill(); }
      }
    };

    const armY = y + 35 + bobY;
    if (dir === 0) {
      drawArm(x - 3, y + 29 + bobY + armSwing);
      drawArm(x + 33, y + 30 + bobY);
      ctx.fillStyle = skin; ctx.fillRect(x + 34, armY, 5, 5);
      drawWand(x + 36, armY, 0);
    } else if (dir === 1) {
      drawArm(x + 36, y + 29 + bobY - armSwing);
      drawArm(x - 1, y + 30 + bobY);
      ctx.fillStyle = skin; ctx.fillRect(x, y + 29 + bobY, 5, 5);
      drawWand(x + 2, y + 29 + bobY, 1);
    } else if (dir === 2) {
      drawArm(x + 12, y + 29 + bobY - armSwing);
      drawArm(x + 4, armY - 2);
      ctx.fillStyle = skin; ctx.fillRect(x, armY - 1, 5, 5);
      drawWand(x - 2, armY, 2);
    } else {
      drawArm(x - 2, y + 29 + bobY + armSwing);
      drawArm(x + 26, armY - 4);
      ctx.fillStyle = skin; ctx.fillRect(x + 35, armY - 3, 5, 5);
      drawWand(x + 38, armY - 2, 3);
    }
    // Casting aura around witch body
    if (isCasting) {
      ctx.strokeStyle = `rgba(160,80,240,${0.5 * (1-castProgress)})`;
      ctx.lineWidth = 2;
      const auraR = 20 + castProgress * 15;
      ctx.beginPath(); ctx.arc(x + 18, y + 35 + bobY, auraR, 0, Math.PI * 2); ctx.stroke();
      // Sparkle particles rising
      for (let sp = 0; sp < 4; sp++) {
        const spAngle = castProgress * Math.PI * 2 + sp * 1.57;
        const spR = 12 + castProgress * 20;
        const spX = x + 18 + Math.cos(spAngle) * spR;
        const spY = y + 35 + bobY + Math.sin(spAngle) * spR - castProgress * 20;
        ctx.fillStyle = `rgba(200,140,255,${0.7 * (1-castProgress)})`;
        ctx.beginPath(); ctx.arc(spX, spY, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (isHealer && !isPreview) {
    // Healer with staff — golden glow when healing
    const isHealing = castTimer > 0;
    const healProgress = isHealing ? 1 - (castTimer / 30) : 0;

    const drawStaff = (sx, sy, sDir) => {
      // Staff shaft — white wood
      ctx.fillStyle = "#d8d0c0";
      if (sDir === 2) { // LEFT
        ctx.fillRect(sx - 22, sy - 1, 26, 3);
        // Golden orb at tip
        ctx.fillStyle = "#ffdd30";
        ctx.beginPath(); ctx.arc(sx - 24, sy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,220,50,0.3)";
        ctx.beginPath(); ctx.arc(sx - 24, sy, 9, 0, Math.PI * 2); ctx.fill();
      } else if (sDir === 3) { // RIGHT
        ctx.fillRect(sx - 4, sy - 1, 26, 3);
        ctx.fillStyle = "#ffdd30";
        ctx.beginPath(); ctx.arc(sx + 24, sy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,220,50,0.3)";
        ctx.beginPath(); ctx.arc(sx + 24, sy, 9, 0, Math.PI * 2); ctx.fill();
      } else if (sDir === 0) { // DOWN
        ctx.fillRect(sx - 1, sy - 4, 3, 26);
        ctx.fillStyle = "#ffdd30";
        ctx.beginPath(); ctx.arc(sx, sy + 24, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,220,50,0.3)";
        ctx.beginPath(); ctx.arc(sx, sy + 24, 9, 0, Math.PI * 2); ctx.fill();
      } else { // UP
        ctx.fillRect(sx - 1, sy - 22, 3, 26);
        ctx.fillStyle = "#ffdd30";
        ctx.beginPath(); ctx.arc(sx, sy - 24, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,220,50,0.3)";
        ctx.beginPath(); ctx.arc(sx, sy - 24, 9, 0, Math.PI * 2); ctx.fill();
      }
      // Extra glow during healing
      if (isHealing) {
        const glowA = 0.4 * (1 - healProgress);
        ctx.fillStyle = `rgba(255,220,80,${glowA})`;
        if (sDir === 2) ctx.beginPath(), ctx.arc(sx - 24, sy, 14 + healProgress * 10, 0, Math.PI * 2), ctx.fill();
        else if (sDir === 3) ctx.beginPath(), ctx.arc(sx + 24, sy, 14 + healProgress * 10, 0, Math.PI * 2), ctx.fill();
        else if (sDir === 0) ctx.beginPath(), ctx.arc(sx, sy + 24, 14 + healProgress * 10, 0, Math.PI * 2), ctx.fill();
        else ctx.beginPath(), ctx.arc(sx, sy - 24, 14 + healProgress * 10, 0, Math.PI * 2), ctx.fill();
      }
    };

    const armY = y + 33 + bobY;
    if (dir === 2) {
      drawArm(x + 33, armY - armSwing);
      drawStaff(x - 2, armY, 2);
      drawArm(x - 3, armY);
    } else if (dir === 3) {
      drawArm(x - 3, armY + armSwing);
      drawStaff(x + 38, armY, 3);
      drawArm(x + 33, armY);
    } else if (dir === 0) {
      drawArm(x - 3, armY + armSwing);
      drawArm(x + 33, armY - armSwing);
      drawStaff(x + 16, y + 42 + bobY, 0);
    } else {
      drawArm(x - 3, armY + armSwing);
      drawArm(x + 33, armY - armSwing);
      drawStaff(x + 16, y + 22 + bobY, 1);
    }

    // Faint glow when healing
    if (isHealing) {
      ctx.fillStyle = `rgba(220,255,220,${0.06 * (1 - healProgress)})`;
      ctx.beginPath(); ctx.arc(x + 18, y + 35 + bobY, 20, 0, Math.PI * 2); ctx.fill();
    }
  } else if (isArcher && !isPreview) {
    // Archer with BLACK bow — sideways for left/right, vertical for up/down
    // castTimer here = bowDrawAnim (45 = just started, 1 = about to release, 0 = idle)
    const isDrawing = castTimer > 0;
    const drawProgress = isDrawing ? 1 - (castTimer / 45) : 0; // 0 = start, 1 = fully drawn

    const drawBow = (bwx, bwy, bDir) => {
      // Bow limb tension — bends more as drawn
      const tension = isDrawing ? 0.15 * drawProgress : 0;
      ctx.strokeStyle = "#1a1a1a"; // black bow
      ctx.lineWidth = 3.5;
      
      // String pull distance — smoothly increases
      const maxPull = 18;
      const pullDist = isDrawing ? maxPull * drawProgress : 0;
      
      if (bDir === 2) { // LEFT — bow held sideways (horizontal)
        const bowR = 20;
        const startA = Math.PI * 0.5 + 0.3 + tension;
        const endA = Math.PI * 1.5 - 0.3 - tension;
        ctx.beginPath(); ctx.arc(bwx, bwy - 6, bowR, startA, endA); ctx.stroke();
        // Bowstring with smooth pullback
        ctx.strokeStyle = "#3a3a3a"; ctx.lineWidth = 1.2;
        const topX = bwx + bowR * Math.cos(startA), topY = bwy - 6 + bowR * Math.sin(startA);
        const botX = bwx + bowR * Math.cos(endA), botY = bwy - 6 + bowR * Math.sin(endA);
        const stringX = bwx + pullDist; // pulls right (away from bow)
        ctx.beginPath(); ctx.moveTo(topX, topY); ctx.lineTo(stringX, bwy - 6); ctx.lineTo(botX, botY); ctx.stroke();
        // Arrow nocked on string
        if (isDrawing) {
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(stringX - 20, bwy - 7, 22, 2);
          // Green poison tip
          ctx.fillStyle = "#30ff20";
          ctx.beginPath(); ctx.moveTo(stringX - 22, bwy - 6); ctx.lineTo(stringX - 17, bwy - 9); ctx.lineTo(stringX - 17, bwy - 3); ctx.closePath(); ctx.fill();
          // Glow intensifies as fully drawn
          ctx.fillStyle = `rgba(50,255,30,${0.15 + 0.35 * drawProgress})`;
          ctx.beginPath(); ctx.arc(stringX - 20, bwy - 6, 5 + 3 * drawProgress, 0, Math.PI * 2); ctx.fill();
        }
      } else if (bDir === 3) { // RIGHT — bow held sideways (horizontal)
        const bowR = 20;
        const startA = -Math.PI * 0.5 + 0.3 + tension;
        const endA = Math.PI * 0.5 - 0.3 - tension;
        ctx.beginPath(); ctx.arc(bwx, bwy - 6, bowR, startA, endA); ctx.stroke();
        ctx.strokeStyle = "#3a3a3a"; ctx.lineWidth = 1.2;
        const topX = bwx + bowR * Math.cos(startA), topY = bwy - 6 + bowR * Math.sin(startA);
        const botX = bwx + bowR * Math.cos(endA), botY = bwy - 6 + bowR * Math.sin(endA);
        const stringX = bwx - pullDist; // pulls left
        ctx.beginPath(); ctx.moveTo(topX, topY); ctx.lineTo(stringX, bwy - 6); ctx.lineTo(botX, botY); ctx.stroke();
        if (isDrawing) {
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(stringX - 2, bwy - 7, 22, 2);
          ctx.fillStyle = "#30ff20";
          ctx.beginPath(); ctx.moveTo(stringX + 22, bwy - 6); ctx.lineTo(stringX + 17, bwy - 9); ctx.lineTo(stringX + 17, bwy - 3); ctx.closePath(); ctx.fill();
          ctx.fillStyle = `rgba(50,255,30,${0.15 + 0.35 * drawProgress})`;
          ctx.beginPath(); ctx.arc(stringX + 20, bwy - 6, 5 + 3 * drawProgress, 0, Math.PI * 2); ctx.fill();
        }
      } else if (bDir === 0) { // DOWN — vertical bow
        const bowR = 18;
        const startA = 0 + 0.3 + tension;
        const endA = Math.PI - 0.3 - tension;
        ctx.beginPath(); ctx.arc(bwx, bwy, bowR, startA, endA); ctx.stroke();
        ctx.strokeStyle = "#3a3a3a"; ctx.lineWidth = 1.2;
        const lX = bwx + bowR * Math.cos(startA), lY = bwy + bowR * Math.sin(startA);
        const rX = bwx + bowR * Math.cos(endA), rY = bwy + bowR * Math.sin(endA);
        const stringY = bwy - pullDist;
        ctx.beginPath(); ctx.moveTo(lX, lY); ctx.lineTo(bwx, stringY); ctx.lineTo(rX, rY); ctx.stroke();
        if (isDrawing) {
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(bwx - 1, stringY, 2, 20);
          ctx.fillStyle = "#30ff20";
          ctx.beginPath(); ctx.moveTo(bwx, stringY + 22); ctx.lineTo(bwx - 3, stringY + 17); ctx.lineTo(bwx + 3, stringY + 17); ctx.closePath(); ctx.fill();
          ctx.fillStyle = `rgba(50,255,30,${0.15 + 0.35 * drawProgress})`;
          ctx.beginPath(); ctx.arc(bwx, stringY + 20, 5 + 3 * drawProgress, 0, Math.PI * 2); ctx.fill();
        }
      } else { // UP — vertical bow
        const bowR = 18;
        const startA = Math.PI + 0.3 + tension;
        const endA = Math.PI * 2 - 0.3 - tension;
        ctx.beginPath(); ctx.arc(bwx, bwy, bowR, startA, endA); ctx.stroke();
        ctx.strokeStyle = "#3a3a3a"; ctx.lineWidth = 1.2;
        const lX = bwx + bowR * Math.cos(startA), lY = bwy + bowR * Math.sin(startA);
        const rX = bwx + bowR * Math.cos(endA), rY = bwy + bowR * Math.sin(endA);
        const stringY = bwy + pullDist;
        ctx.beginPath(); ctx.moveTo(lX, lY); ctx.lineTo(bwx, stringY); ctx.lineTo(rX, rY); ctx.stroke();
        if (isDrawing) {
          ctx.fillStyle = "#1a1a1a";
          ctx.fillRect(bwx - 1, stringY - 20, 2, 20);
          ctx.fillStyle = "#30ff20";
          ctx.beginPath(); ctx.moveTo(bwx, stringY - 22); ctx.lineTo(bwx - 3, stringY - 17); ctx.lineTo(bwx + 3, stringY - 17); ctx.closePath(); ctx.fill();
          ctx.fillStyle = `rgba(50,255,30,${0.15 + 0.35 * drawProgress})`;
          ctx.beginPath(); ctx.arc(bwx, stringY - 20, 5 + 3 * drawProgress, 0, Math.PI * 2); ctx.fill();
        }
      }
    };

    // Black arms
    const armY = y + 33 + bobY;
    ctx.fillStyle = "#1a1a1a";
    if (dir === 2) {
      drawArm(x + 33, armY - armSwing);
      drawBow(x - 6, armY, 2);
      drawArm(x - 3, armY + (isDrawing ? 4 : 0));
    } else if (dir === 3) {
      drawArm(x - 3, armY + armSwing);
      drawBow(x + 42, armY, 3);
      drawArm(x + 33, armY + (isDrawing ? 4 : 0));
    } else if (dir === 0) {
      drawArm(x - 3, armY + armSwing);
      drawArm(x + 33, armY - armSwing);
      drawBow(x + 16, y + 44 + bobY, 0);
    } else {
      drawArm(x - 3, armY + armSwing);
      drawArm(x + 33, armY - armSwing);
      drawBow(x + 16, y + 22 + bobY, 1);
    }
  } else {
    if (dir === 2) drawArm(x + 33, y + 29 + bobY - armSwing);
    else if (dir === 3) drawArm(x, y + 29 + bobY + armSwing);
    else { drawArm(x - 3, y + 29 + bobY + armSwing); drawArm(x + 36, y + 29 + bobY - armSwing); }
  }

  // Head
  const hx = x - 2, hy = y + bobY;
  if (isGolem) {
    // Massive stone head
    ctx.fillStyle = "#6a6560";
    ctx.beginPath(); ctx.roundRect(hx + 0, hy + 2, 40, 24, 6); ctx.fill();
    // Stone brow ridge
    ctx.fillStyle = "#5a5550";
    ctx.fillRect(hx + 2, hy + 2, 36, 8);
    // Glowing eyes
    ctx.fillStyle = "#ff8830";
    ctx.fillRect(hx + 8, hy + 12, 7, 5);
    ctx.fillRect(hx + 25, hy + 12, 7, 5);
    // Eye glow
    const t2 = renderTime / 300;
    const eyeGlow = 0.3 + 0.15 * Math.sin(t2);
    ctx.fillStyle = `rgba(255,140,40,${eyeGlow})`;
    ctx.beginPath(); ctx.arc(hx + 11, hy + 14, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx + 28, hy + 14, 6, 0, Math.PI * 2); ctx.fill();
    // Jaw line
    ctx.fillStyle = "#585450";
    ctx.fillRect(hx + 6, hy + 22, 28, 4);
    // Cracks on face
    ctx.strokeStyle = "#484440"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx + 18, hy + 4); ctx.lineTo(hx + 14, hy + 18); ctx.stroke();
  } else if (isArcher) {
    // Black hood — deep and menacing
    ctx.fillStyle = "#0e0e0e";
    ctx.beginPath(); ctx.roundRect(hx - 2, hy - 2, 44, 34, 12); ctx.fill();
    // Hood peak — tall and sharp
    ctx.beginPath();
    ctx.moveTo(hx + 10, hy - 4);
    ctx.lineTo(hx + 20, hy - 14);
    ctx.lineTo(hx + 30, hy - 4);
    ctx.closePath();
    ctx.fill();
    // Hood draping sides
    ctx.fillRect(hx - 3, hy + 8, 6, 18);
    ctx.fillRect(hx + 37, hy + 8, 6, 18);
    // Deep void inside hood
    ctx.fillStyle = "#050505";
    ctx.beginPath(); ctx.roundRect(hx + 4, hy + 5, 32, 22, 8); ctx.fill();
    // Skull barely visible — dark bone color
    if (dir !== 1) {
      ctx.fillStyle = "#3a3530";
      ctx.beginPath(); ctx.roundRect(hx + 8, hy + 10, 24, 14, 5); ctx.fill();
      // Dark eye sockets
      ctx.fillStyle = "#0a0a0a";
      if (dir === 0) {
        ctx.beginPath(); ctx.arc(hx + 14, hy + 15, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 26, hy + 15, 4, 0, Math.PI * 2); ctx.fill();
      } else if (dir === 2) {
        ctx.beginPath(); ctx.arc(hx + 12, hy + 15, 4, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(hx + 28, hy + 15, 4, 0, Math.PI * 2); ctx.fill();
      }
      // Glowing green eyes — piercing from the darkness
      ctx.fillStyle = "#30ff20";
      if (dir === 0) {
        ctx.beginPath(); ctx.arc(hx + 14, hy + 15, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 26, hy + 15, 2.5, 0, Math.PI * 2); ctx.fill();
      } else if (dir === 2) {
        ctx.beginPath(); ctx.arc(hx + 12, hy + 15, 2.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(hx + 28, hy + 15, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      // Eye glow — eerie
      ctx.fillStyle = "rgba(50,255,30,0.25)";
      if (dir === 0) {
        ctx.beginPath(); ctx.arc(hx + 14, hy + 15, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 26, hy + 15, 7, 0, Math.PI * 2); ctx.fill();
      } else if (dir === 2) {
        ctx.beginPath(); ctx.arc(hx + 12, hy + 15, 7, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(hx + 28, hy + 15, 7, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Jaw/mouth — skeletal
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(hx + 15, hy + 20, 10, 3);
  } else if (isHealer) {
    // Healer head — white hood with golden halo
    ctx.fillStyle = "#eee8dd";
    ctx.beginPath(); ctx.roundRect(hx - 1, hy - 1, 42, 32, 10); ctx.fill();
    // Hood peak
    ctx.beginPath();
    ctx.moveTo(hx + 12, hy - 3);
    ctx.lineTo(hx + 20, hy - 12);
    ctx.lineTo(hx + 28, hy - 3);
    ctx.closePath();
    ctx.fill();
    // Shadow inside hood
    ctx.fillStyle = "#c8c0b0";
    ctx.beginPath(); ctx.roundRect(hx + 5, hy + 6, 30, 20, 6); ctx.fill();
    // Face
    ctx.fillStyle = "#e8d8c8";
    ctx.beginPath(); ctx.roundRect(hx + 8, hy + 8, 24, 16, 5); ctx.fill();
    // Golden glowing eyes
    if (dir !== 1) {
      ctx.fillStyle = "#ffdd30";
      if (dir === 0) {
        ctx.beginPath(); ctx.arc(hx + 14, hy + 14, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 26, hy + 14, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,220,50,0.25)";
        ctx.beginPath(); ctx.arc(hx + 14, hy + 14, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 26, hy + 14, 6, 0, Math.PI * 2); ctx.fill();
      } else if (dir === 2) {
        ctx.beginPath(); ctx.arc(hx + 12, hy + 14, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,220,50,0.25)";
        ctx.beginPath(); ctx.arc(hx + 12, hy + 14, 6, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(hx + 28, hy + 14, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,220,50,0.25)";
        ctx.beginPath(); ctx.arc(hx + 28, hy + 14, 6, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Halo above head
    ctx.strokeStyle = "rgba(255,220,80,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(hx + 20, hy - 8, 14, 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,220,80,0.25)";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(hx + 20, hy - 8, 16, 6, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (isMummy) {
    ctx.fillStyle = "#4a4650";
    ctx.beginPath(); ctx.roundRect(hx + 2, hy + 4, 36, 28, 8); ctx.fill();
    // Bandage wraps across head
    ctx.fillStyle = "#9a9590";
    ctx.fillRect(hx + 1, hy + 2, 38, 4);
    ctx.fillRect(hx + 3, hy + 10, 34, 3);
    ctx.fillRect(hx + 0, hy + 18, 40, 4);
    ctx.fillRect(hx + 4, hy + 26, 32, 3);
    // Diagonal wrap
    ctx.save();
    ctx.translate(hx + 20, hy + 16);
    ctx.rotate(0.5);
    ctx.fillRect(-18, -1, 36, 3);
    ctx.restore();
    // Creepy round eyes — white circles with small pupils
    if (dir !== 1) {
      ctx.fillStyle = "#ddd";
      if (dir === 0) {
        ctx.beginPath(); ctx.arc(hx + 12, hy + 15, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 28, hy + 15, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#222";
        ctx.beginPath(); ctx.arc(hx + 13, hy + 15, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 29, hy + 15, 2.5, 0, Math.PI * 2); ctx.fill();
      } else if (dir === 2) {
        ctx.beginPath(); ctx.arc(hx + 10, hy + 15, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#222";
        ctx.beginPath(); ctx.arc(hx + 9, hy + 15, 2.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(hx + 30, hy + 15, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#222";
        ctx.beginPath(); ctx.arc(hx + 31, hy + 15, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Top bandage wraps (like hair area)
    ctx.fillStyle = "#8a8580";
    ctx.fillRect(hx + 0, hy, 40, 6);
    ctx.fillStyle = "#9a9590";
    ctx.fillRect(hx + 2, hy - 2, 36, 4);
  } else if (isShadowknife) {
    // Dark assassin hood — covers entire head
    ctx.fillStyle = "#0a0a1a";
    ctx.beginPath(); ctx.roundRect(hx - 1, hy - 1, 42, 32, 10); ctx.fill();
    // Hood peak
    ctx.beginPath();
    ctx.moveTo(hx + 12, hy - 2);
    ctx.lineTo(hx + 20, hy - 10);
    ctx.lineTo(hx + 28, hy - 2);
    ctx.closePath();
    ctx.fill();
    // Dark void face
    ctx.fillStyle = "#050510";
    ctx.beginPath(); ctx.roundRect(hx + 6, hy + 6, 28, 18, 6); ctx.fill();
    // Glowing purple eyes
    if (dir !== 1) {
      ctx.fillStyle = "#8040c0";
      if (dir === 0) {
        ctx.beginPath(); ctx.arc(hx + 14, hy + 14, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 26, hy + 14, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(128,64,192,0.3)";
        ctx.beginPath(); ctx.arc(hx + 14, hy + 14, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 26, hy + 14, 5, 0, Math.PI * 2); ctx.fill();
      } else if (dir === 2) {
        ctx.beginPath(); ctx.arc(hx + 12, hy + 14, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(128,64,192,0.3)";
        ctx.beginPath(); ctx.arc(hx + 12, hy + 14, 5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(hx + 28, hy + 14, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(128,64,192,0.3)";
        ctx.beginPath(); ctx.arc(hx + 28, hy + 14, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else {
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.roundRect(hx + 2, hy + 4, 36, 28, 8); ctx.fill();

  // Hair
  if (isSkeleton) {
    // Bare skull — no hair, just rounded cranium
    ctx.fillStyle = "#d0c8b8";
    ctx.beginPath(); ctx.roundRect(hx + 1, hy - 2, 38, 14, 8); ctx.fill();
  } else {
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.roundRect(hx, hy, 40, 16, 6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 3, hy); ctx.lineTo(hx + 8, hy - 12); ctx.lineTo(hx + 13, hy + 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 10, hy); ctx.lineTo(hx + 18, hy - 16); ctx.lineTo(hx + 24, hy + 1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 20, hy); ctx.lineTo(hx + 27, hy - 13); ctx.lineTo(hx + 32, hy + 1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 28, hy); ctx.lineTo(hx + 34, hy - 9); ctx.lineTo(hx + 39, hy + 2); ctx.fill();
  if (dir === 1) { ctx.beginPath(); ctx.roundRect(hx, hy, 40, 30, 6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx+3,hy); ctx.lineTo(hx+8,hy-12); ctx.lineTo(hx+13,hy+2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx+10,hy); ctx.lineTo(hx+18,hy-16); ctx.lineTo(hx+24,hy+1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx+20,hy); ctx.lineTo(hx+27,hy-13); ctx.lineTo(hx+32,hy+1); ctx.fill();
  } else if (dir === 2) ctx.fillRect(hx + 28, hy + 4, 8, 18);
  else if (dir === 3) ctx.fillRect(hx + 2, hy + 4, 8, 18);
  else { ctx.fillRect(hx, hy + 4, 5, 14); ctx.fillRect(hx + 35, hy + 4, 5, 14); }
  }
  } // end golem head else

  // Face (skip for golem — has its own eyes, skip for shadowknife — has hood)
  if (dir !== 1 && !isGolem && !isMummy && !isArcher && !isHealer && !isShadowknife) {
    if (isSkeleton) {
      // Skeleton face — hollow eye sockets and teeth
      ctx.fillStyle = "#222";
      if (dir === 0) {
        ctx.fillRect(hx+10,hy+14,5,5); ctx.fillRect(hx+25,hy+14,5,5);
        ctx.fillStyle = "#1a1a1a"; ctx.fillRect(hx+15,hy+22,10,2);
        ctx.fillStyle = "#ddd"; // teeth
        for (let t = 0; t < 4; t++) ctx.fillRect(hx + 16 + t * 2, hy + 24, 1, 2);
      } else if (dir === 2) {
        ctx.fillRect(hx+6,hy+14,5,5);
        ctx.fillStyle = "#ddd"; ctx.fillRect(hx+4,hy+24,6,1);
      } else {
        ctx.fillRect(hx+29,hy+14,5,5);
        ctx.fillStyle = "#ddd"; ctx.fillRect(hx+30,hy+24,6,1);
      }
    } else {
    ctx.fillStyle = "#111";
    if (dir === 0) {
      ctx.fillRect(hx+8,hy+14,6,6); ctx.fillRect(hx+26,hy+14,6,6);
      ctx.fillStyle="#fff"; ctx.fillRect(hx+8,hy+14,3,3); ctx.fillRect(hx+26,hy+14,3,3);
      ctx.fillStyle="#906050"; ctx.fillRect(hx+15,hy+24,8,3);
    } else if (dir === 2) {
      ctx.fillRect(hx+6,hy+14,6,6); ctx.fillStyle="#fff"; ctx.fillRect(hx+6,hy+14,3,3);
    } else {
      ctx.fillRect(hx+28,hy+14,6,6); ctx.fillStyle="#fff"; ctx.fillRect(hx+28,hy+14,3,3);
    }
    }
  }

  // Witch hat (drawn on top of everything)
  if (isWitch) {
    ctx.fillStyle = "#2a1a3a";
    // Hat brim
    ctx.fillRect(hx - 4, hy - 2, 48, 6);
    // Hat cone
    ctx.beginPath();
    ctx.moveTo(hx + 4, hy - 2);
    ctx.lineTo(hx + 20, hy - 30);
    ctx.lineTo(hx + 36, hy - 2);
    ctx.closePath();
    ctx.fill();
    // Hat band
    ctx.fillStyle = "#6a3a8a";
    ctx.fillRect(hx + 8, hy - 4, 24, 3);
    // Hat tip curl
    ctx.fillStyle = "#2a1a3a";
    ctx.beginPath();
    ctx.moveTo(hx + 20, hy - 30);
    ctx.quadraticCurveTo(hx + 30, hy - 32, hx + 28, hy - 24);
    ctx.lineTo(hx + 22, hy - 26);
    ctx.closePath();
    ctx.fill();
    // Glow particles around witch
    const t = renderTime / 300;
    ctx.fillStyle = "rgba(120,60,180,0.4)";
    for (let p = 0; p < 3; p++) {
      const angle = t + p * 2.1;
      const px2 = hx + 20 + Math.cos(angle) * 24;
      const py2 = hy + 15 + Math.sin(angle) * 18;
      ctx.beginPath(); ctx.arc(px2, py2, 2 + Math.sin(t + p) * 1, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ===================== FLOOR 1 OVERLAYS =====================
  // Head accessories, weapons, and special effects drawn on top
  if (isFloor1Mob) {
    // --- Neon Pickpocket: hood up + blade glint ---
    if (isNeonPickpocket) {
      // Hood over hair
      ctx.fillStyle = "#1a1a3a";
      ctx.beginPath(); ctx.roundRect(hx - 1, hy - 2, 42, 14, 6); ctx.fill();
      // Hood peak
      ctx.beginPath();
      ctx.moveTo(hx + 12, hy - 2);
      ctx.lineTo(hx + 20, hy - 8);
      ctx.lineTo(hx + 28, hy - 2);
      ctx.closePath();
      ctx.fill();
      // Cyan hood trim
      ctx.fillStyle = "#00ccff";
      ctx.fillRect(hx + 2, hy + 10, 36, 1);
      // Small blade glint in hand area
      const bladeX = dir === 2 ? x - 4 : dir === 3 ? x + 38 : x + 34;
      const bladeY = y + 44 + bobY;
      ctx.fillStyle = "#a0d0ff";
      ctx.fillRect(bladeX, bladeY, 2, 8);
      ctx.fillStyle = "rgba(160,208,255,0.4)";
      ctx.beginPath(); ctx.arc(bladeX + 1, bladeY, 3, 0, Math.PI * 2); ctx.fill();
    }

    // --- Cyber Mugger: face mask + electric baton ---
    if (isCyberMugger) {
      // Face mask/bandana
      ctx.fillStyle = "#2a2a3a";
      if (dir !== 1) {
        ctx.fillRect(hx + 4, hy + 18, 32, 10);
        // Metal studs on mask
        ctx.fillStyle = "#5a5a6a";
        ctx.fillRect(hx + 10, hy + 21, 2, 2);
        ctx.fillRect(hx + 28, hy + 21, 2, 2);
      }
      // Electric baton
      const batonX = dir === 2 ? x - 6 : dir === 3 ? x + 38 : x + 34;
      const batonY = y + 38 + bobY;
      ctx.fillStyle = "#3a3a40";
      ctx.fillRect(batonX, batonY, 3, 14);
      // Electric spark at tip
      const spark = Math.sin(renderTime * 0.015) > 0;
      if (spark) {
        ctx.fillStyle = "#ffff40";
        ctx.beginPath(); ctx.arc(batonX + 1, batonY - 1, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,60,0.3)";
        ctx.beginPath(); ctx.arc(batonX + 1, batonY - 1, 6, 0, Math.PI * 2); ctx.fill();
      }
    }

    // --- Drone Lookout: tech visor + antenna ---
    if (isDroneLookout) {
      // Tech visor across eyes
      ctx.fillStyle = "#1a1a2a";
      if (dir !== 1) {
        ctx.fillRect(hx + 2, hy + 10, 36, 8);
        // Red lens
        ctx.fillStyle = "#ff3030";
        if (dir === 0) {
          ctx.fillRect(hx + 8, hy + 12, 8, 4);
          ctx.fillRect(hx + 24, hy + 12, 8, 4);
        } else if (dir === 2) {
          ctx.fillRect(hx + 4, hy + 12, 10, 4);
        } else {
          ctx.fillRect(hx + 26, hy + 12, 10, 4);
        }
        // Red glow
        ctx.fillStyle = "rgba(255,48,48,0.15)";
        ctx.fillRect(hx + 2, hy + 10, 36, 8);
      }
      // Antenna on back
      if (dir === 0 || dir === 2 || dir === 3) {
        ctx.fillStyle = "#3a3a4a";
        ctx.fillRect(hx + 30, hy - 8, 2, 12);
        // Antenna tip blink
        const blink = Math.sin(renderTime * 0.006) > 0.3;
        ctx.fillStyle = blink ? "#ff3030" : "#801010";
        ctx.beginPath(); ctx.arc(hx + 31, hy - 9, 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // --- Street Chemist: gas mask + goggles ---
    if (isStreetChemist) {
      // Gas mask/respirator
      if (dir !== 1) {
        ctx.fillStyle = "#3a3a3a";
        ctx.fillRect(hx + 6, hy + 16, 28, 12);
        // Filter canisters
        ctx.fillStyle = "#4a4a4a";
        ctx.beginPath(); ctx.arc(hx + 10, hy + 24, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 30, hy + 24, 4, 0, Math.PI * 2); ctx.fill();
        // Eye pieces (green tint)
        ctx.fillStyle = "#40aa30";
        if (dir === 0) {
          ctx.beginPath(); ctx.arc(hx + 14, hy + 18, 4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(hx + 26, hy + 18, 4, 0, Math.PI * 2); ctx.fill();
        } else if (dir === 2) {
          ctx.beginPath(); ctx.arc(hx + 12, hy + 18, 4, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(hx + 28, hy + 18, 4, 0, Math.PI * 2); ctx.fill();
        }
        // Green lens glow
        ctx.fillStyle = "rgba(64,170,48,0.2)";
        ctx.fillRect(hx + 6, hy + 12, 28, 10);
      }
      // Goggles pushed up on forehead
      ctx.fillStyle = "#5a5a5a";
      ctx.fillRect(hx + 6, hy + 4, 28, 5);
      ctx.fillStyle = "#80cc60";
      ctx.beginPath(); ctx.arc(hx + 14, hy + 6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + 26, hy + 6, 3, 0, Math.PI * 2); ctx.fill();
    }

    // --- Renegade Bruiser: heavy brow + red stripe on face ---
    if (isRenegadeBruiser) {
      // Heavy brow ridge
      ctx.fillStyle = "#4a3a30";
      ctx.fillRect(hx + 2, hy + 8, 36, 4);
      // Red war paint stripe
      ctx.fillStyle = "#cc2020";
      if (dir !== 1) {
        ctx.fillRect(hx + 8, hy + 14, 4, 12);
      }
    }

    // --- Renegade Demo: blast goggles ---
    if (isRenegadeDemo) {
      // Blast goggles
      ctx.fillStyle = "#4a4030";
      ctx.fillRect(hx + 4, hy + 8, 32, 8);
      // Orange tinted lenses
      ctx.fillStyle = "#ff8040";
      if (dir === 0) {
        ctx.beginPath(); ctx.arc(hx + 14, hy + 12, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 26, hy + 12, 4, 0, Math.PI * 2); ctx.fill();
      } else if (dir === 2) {
        ctx.beginPath(); ctx.arc(hx + 11, hy + 12, 4, 0, Math.PI * 2); ctx.fill();
      } else if (dir === 3) {
        ctx.beginPath(); ctx.arc(hx + 29, hy + 12, 4, 0, Math.PI * 2); ctx.fill();
      }
      // Goggle glow
      ctx.fillStyle = "rgba(255,128,64,0.15)";
      ctx.fillRect(hx + 4, hy + 8, 32, 8);
    }

    // --- Renegade Sniper: hood/cap + scope ---
    if (isRenegadeSniper) {
      // Hood/cap
      ctx.fillStyle = "#2a2a3a";
      ctx.beginPath(); ctx.roundRect(hx, hy - 2, 40, 12, 4); ctx.fill();
      // Cap brim
      if (dir === 0) {
        ctx.fillRect(hx + 4, hy + 8, 32, 4);
      } else if (dir === 2) {
        ctx.fillRect(hx - 4, hy + 6, 20, 4);
      } else if (dir === 3) {
        ctx.fillRect(hx + 24, hy + 6, 20, 4);
      }
      // Scope glint when facing player
      if (dir === 0) {
        const glint = Math.sin(renderTime * 0.004) > 0.5;
        if (glint) {
          ctx.fillStyle = "#ff2020";
          ctx.beginPath(); ctx.arc(hx + 36, hy + 14, 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(255,32,32,0.3)";
          ctx.beginPath(); ctx.arc(hx + 36, hy + 14, 5, 0, Math.PI * 2); ctx.fill();
        }
      }
      // Rifle barrel
      const rifleDir = dir;
      if (rifleDir === 2) {
        ctx.fillStyle = "#2a2a30";
        ctx.fillRect(x - 18, y + 38 + bobY, 22, 3);
        ctx.fillStyle = "#1a1a20";
        ctx.fillRect(x - 22, y + 37 + bobY, 6, 5);
      } else if (rifleDir === 3) {
        ctx.fillStyle = "#2a2a30";
        ctx.fillRect(x + 36, y + 38 + bobY, 22, 3);
        ctx.fillStyle = "#1a1a20";
        ctx.fillRect(x + 56, y + 37 + bobY, 6, 5);
      } else if (rifleDir === 0) {
        ctx.fillStyle = "#2a2a30";
        ctx.fillRect(x + 30, y + 42 + bobY, 3, 18);
        ctx.fillStyle = "#1a1a20";
        ctx.fillRect(x + 29, y + 58 + bobY, 5, 4);
      }
    }

    // --- The Don: fedora + cigar ---
    if (isTheDon) {
      // Fedora hat
      ctx.fillStyle = "#2a1a0a";
      // Hat brim
      ctx.fillRect(hx - 4, hy + 2, 48, 5);
      // Hat crown
      ctx.fillRect(hx + 4, hy - 8, 32, 12);
      // Hat band
      ctx.fillStyle = "#cc2020";
      ctx.fillRect(hx + 4, hy - 1, 32, 3);
      // Hat top crease
      ctx.fillStyle = "#1a0a00";
      ctx.fillRect(hx + 10, hy - 8, 20, 2);
      // Cigar (when facing forward/side)
      if (dir === 0 || dir === 3) {
        ctx.fillStyle = "#8a6040";
        ctx.fillRect(hx + 32, hy + 22, 10, 3);
        // Cigar ember
        ctx.fillStyle = "#ff6020";
        ctx.beginPath(); ctx.arc(hx + 43, hy + 23, 2, 0, Math.PI * 2); ctx.fill();
        // Smoke
        ctx.fillStyle = "rgba(180,180,180,0.2)";
        ctx.beginPath(); ctx.arc(hx + 44, hy + 18, 3 + Math.sin(renderTime * 0.003) * 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 46, hy + 12, 2 + Math.sin(renderTime * 0.004) * 1.5, 0, Math.PI * 2); ctx.fill();
      } else if (dir === 2) {
        ctx.fillStyle = "#8a6040";
        ctx.fillRect(hx - 2, hy + 22, 10, 3);
        ctx.fillStyle = "#ff6020";
        ctx.beginPath(); ctx.arc(hx - 3, hy + 23, 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // --- Velocity: energy helmet + afterimage effect ---
    if (isVelocity) {
      // Sleek helmet overlay
      ctx.fillStyle = "#1a1a4a";
      ctx.beginPath(); ctx.roundRect(hx, hy - 2, 40, 14, 6); ctx.fill();
      // Visor (bright blue)
      if (dir !== 1) {
        const pulse = 0.5 + 0.5 * Math.sin(renderTime * 0.008);
        ctx.fillStyle = `rgba(80,80,255,${0.6 + pulse * 0.3})`;
        if (dir === 0) {
          ctx.fillRect(hx + 4, hy + 10, 32, 5);
        } else if (dir === 2) {
          ctx.fillRect(hx + 2, hy + 10, 18, 5);
        } else {
          ctx.fillRect(hx + 20, hy + 10, 18, 5);
        }
        // Visor bright center
        ctx.fillStyle = `rgba(140,140,255,${0.4 + pulse * 0.3})`;
        if (dir === 0) {
          ctx.fillRect(hx + 10, hy + 11, 20, 3);
        }
      }
      // Energy trail behind when moving
      if (moving) {
        const trailDir = dir === 0 ? 1 : dir === 1 ? -1 : dir === 2 ? 1 : -1;
        for (let ti = 1; ti <= 3; ti++) {
          const alpha = 0.15 / ti;
          ctx.fillStyle = `rgba(60,60,255,${alpha})`;
          const offX = dir === 2 ? ti * 8 : dir === 3 ? -ti * 8 : 0;
          const offY = dir === 0 ? -ti * 8 : dir === 1 ? ti * 8 : 0;
          ctx.fillRect(x + 4 + offX, y + 28 + bobY + offY, 32, 20);
        }
      }
    }
  }
}

// === SHARED NAME TAG + HP BAR ===
function drawNameTag(sx, sy, hy, name, hp, isPlayer, maxHp) {
  if (name === "" || name == null) return; // skip for afterimages with no name
  // Health bar ABOVE character (above hair spikes) — skip for deli NPCs (hp < 0)
  if (hp >= 0 && (!isPlayer || gameSettings.playerHpBar)) {
    const bw = 44;
    const hpY = hy - 28;
    const hpMax = maxHp || 100;
    const hpPct = Math.max(0, Math.min(1, hp / hpMax));
    ctx.fillStyle = "#400";
    ctx.fillRect(sx - bw/2, hpY, bw, 5);
    ctx.fillStyle = "#e22";
    ctx.fillRect(sx - bw/2, hpY, bw * hpPct, 5);
    ctx.fillStyle = "rgba(255,150,150,0.3)";
    ctx.fillRect(sx - bw/2, hpY, bw * hpPct, 2);
    // Border
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - bw/2, hpY, bw, 5);
  }

  // HP text above bar (mobs only, not player)
  if (!isPlayer && gameSettings.mobHpText) {
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ddd";
    ctx.fillText(Math.ceil(hp) + "/" + hpMax, sx, hpY - 3);
    ctx.textAlign = "left";
  }

  // Name BELOW hitbox circle
  ctx.font = "bold 13px monospace";
  const tw = ctx.measureText(name).width + 14;
  const tagX = sx - tw / 2;
  const tagY = sy + 18;
  ctx.fillStyle = isPlayer ? "rgba(140,0,0,0.85)" : "rgba(0,0,0,0.75)";
  ctx.fillRect(tagX, tagY, tw, 17);
  ctx.strokeStyle = isPlayer ? "rgba(200,0,0,0.5)" : "rgba(80,80,80,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(tagX, tagY, tw, 17);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(name, sx, tagY + 13);
}

