// Armor visual configuration — tier colors, animation params
// Maps directly to Unity ScriptableObjects for migration
//
// Each tier defines color palettes used across all armor pieces.
// Pieces reference shared colors (primary, secondary, dark, highlight)
// plus piece-specific overrides where needed.

const ARMOR_VISUALS = {
  // --- Tier 1: Leather ---
  1: {
    name: "Leather",
    primary:   "#6a5030",
    secondary: "#7a6040",
    dark:      "#5a4028",
    darker:    "#3a2a18",
    highlight: "#7a6040",
    belt:      "#5a4020",    // chest bottom trim
    accent:    null,
    glow:      null,
    animSpeed: 0,
  },

  // --- Tier 2: Iron / Chainmail ---
  2: {
    name: "Iron",
    primary:     "#4a5a64",
    secondary:   "#6a7a84",
    dark:        "#3a4a54",
    highlight:   "#5a6a74",
    accent:      "#8a9aa4",   // rivets, helmet bolts
    bootStripe:  "#7a8a94",   // boot silver accent stripe
    glow:        null,
    animSpeed:   0,
  },

  // --- Tier 3: Warden / Plate ---
  3: {
    name: "Warden",
    primary:     "#3a4a3a",
    secondary:   "#4a5a4a",
    dark:        "#2a3a2a",
    highlight:   "#5a6a5a",
    emberEmblem: "#8a6030",   // chest center emblem base
    glow: { color: [220, 140, 50], baseAlpha: 0.3, amplitude: 0.15 },
    animSpeed:   0.005,
  },

  // --- Tier 4: Void ---
  4: {
    name: "Void",
    primary:      "#1a1020",
    secondary:    "#2a1a30",
    dark:         "#1a1020",
    highlight:    "#2a1a30",
    voidCore:     "#3a1a4a",   // chest cross emblem
    bootSole:     "#0a0810",   // boot dark sole
    glow: { color: [140, 50, 220], baseAlpha: 0.4, amplitude: 0.2 },
    animSpeed:    0.006,
    // Extra glow variants used by specific pieces
    shimmer:      [180, 100, 255],  // boot shimmer
    coreGlow:     [180, 80, 255],   // chest core orb
    eyeGlow:      [160, 60, 255],   // helmet visor eyes
  },
};

/**
 * Compute a tier's animated glow alpha for a given time.
 * Returns 0 when the tier has no glow definition.
 *
 * @param {number} tier   - armor tier (1-4)
 * @param {number} time   - current timestamp (use renderTime)
 * @param {number} [speedOverride] - optional per-call speed multiplier
 * @returns {number} alpha value (0-1 range)
 */
function tierGlow(tier, time, speedOverride) {
  const tv = ARMOR_VISUALS[tier];
  if (!tv || !tv.glow) return 0;
  const speed = speedOverride || tv.animSpeed;
  return tv.glow.baseAlpha + Math.sin(time * speed) * tv.glow.amplitude;
}
