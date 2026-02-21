// ===================== ITEM DATA =====================
// Shared data: categories, palette, stat renderers, tier helpers
// Extracted from index_2.html — Phase A, Step 3

// ===================== ITEM CATEGORIES =====================
const ITEM_CATEGORIES = {
  equipment: ['gun', 'melee', 'boots', 'pants', 'chest', 'helmet'],
  armor: ['boots', 'pants', 'chest', 'helmet'],
  weapons: ['gun', 'melee'],
};

// ===================== PALETTE =====================
// Centralized color constants — change here to re-theme the entire UI.
const PALETTE = {
  accent: "#5fca80",        // Main UI green (buttons, highlights, titles)
  panelBg: "#0c1018",       // Dark panel backgrounds
  panelBorder: "#2a6a4a",   // Green panel borders
  headerBg: "rgba(30,60,45,0.5)", // Panel header bar fill
  closeBtn: "#c33",         // Close/cancel button red
  gold: "#ffd740",          // Gold/currency text
  tierColors: ['#888', '#5fca80', '#4a9eff', '#ff9a40', '#ff4a8a'],
  tierNames: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
};

// ===================== ITEM STAT RENDERERS =====================
// Each item type maps to a function that calls drawStat() for its stats.
const ITEM_STAT_RENDERERS = {
  gun: (d, drawStat) => {
    drawStat("Damage", d.damage || "—", "#ff8866");
    drawStat("Fire Rate", d.fireRate ? (60/d.fireRate).toFixed(1) + "/s" : "—", "#ffcc44");
    drawStat("Mag Size", d.magSize || "—", "#66bbff");
    if (d.special) drawStat("Special", d.special.charAt(0).toUpperCase() + d.special.slice(1), "#ff66cc");
  },
  melee: (d, drawStat) => {
    drawStat("Damage", d.damage || "—", "#ff8866");
    drawStat("Crit Chance", d.critChance ? Math.round(d.critChance * 100) + "%" : "—", "#ffcc44");
    drawStat("Range", d.range || "—", "#66bbff");
    drawStat("Cooldown", d.cooldown ? (d.cooldown / 60).toFixed(2) + "s" : "—", "#aaa");
    if (d.special) drawStat("Special", d.special.charAt(0).toUpperCase() + d.special.slice(1), "#ff66cc");
  },
  boots: (d, drawStat) => {
    drawStat("Speed", d.speedBonus ? "+" + d.speedBonus : "—", "#66ff88");
    if (d.dodgeChance) drawStat("Dodge", Math.round(d.dodgeChance * 100) + "%", "#ffcc44");
    if (d.special === 'shadowstep') drawStat("Special", "Shadow Step", "#bb88ff");
    if (d.special === 'phase') drawStat("Special", "Phase Through", "#44ddff");
  },
  pants: (d, drawStat) => {
    drawStat("Dmg Reduce", d.dmgReduce ? Math.round(d.dmgReduce * 100) + "%" : "—", "#66bbff");
    if (d.projReduce) drawStat("Proj Reduce", Math.round(d.projReduce * 100) + "%", "#88aaff");
    if (d.thorns) drawStat("Thorns", Math.round(d.thorns * 100) + "%", "#ff6644");
    if (d.stagger) drawStat("Stagger", Math.round(d.stagger * 100) + "% chance", "#ffaa44");
  },
  chest: (d, drawStat) => {
    if (d.hpBonus) drawStat("Max HP", "+" + d.hpBonus, "#ff6666");
    drawStat("Dmg Reduce", d.dmgReduce ? Math.round(d.dmgReduce * 100) + "%" : "—", "#66bbff");
    if (d.healBoost) drawStat("Heal Boost", "+" + Math.round(d.healBoost * 100) + "%", "#66ff88");
    if (d.regen) drawStat("Regen", d.regen + " HP/s", "#44ffaa");
    if (d.revive) drawStat("Special", "Auto-Revive", "#ffd700");
  },
  helmet: (d, drawStat) => {
    drawStat("Poison Resist", d.poisonReduce ? Math.round(d.poisonReduce * 100) + "%" : "—", "#88ff66");
    if (d.statusReduce) drawStat("Status Resist", Math.round(d.statusReduce * 100) + "%", "#cccc44");
    if (d.absorb) drawStat("Absorb", Math.round(d.absorb * 100) + "% → Heal", "#ff88ff");
  },
};

// Get tier color/name from PALETTE
function getTierColor(tier) {
  return PALETTE.tierColors[tier] || '#888';
}
function getTierName(tier) {
  return PALETTE.tierNames[tier] || '';
}
