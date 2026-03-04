// ===================== SKILL REGISTRY =====================
// Unified skill metadata: categories, icons, colors in one place.
// Adding a new skill = 1 line here. No other files need changes.
//
// Depends on: PALETTE (itemData.js) for Jobs category color fallback

const SKILL_REGISTRY = {
  Killing: {
    color: "#e05050", icon: "💀",
    skills: {
      'Total Kills':    { icon: "💀", color: "#e05050" },
      Deaths:           { icon: "☠", color: "#a04040" },
      'K/D Ratio':      { icon: "📊", color: "#e08050" },
      'Melee Kills':    { icon: "⚔", color: "#d04040" },
      'Gun Kills':      { icon: "🔫", color: "#e08030" },
      Headshots:        { icon: "🎯", color: "#e07030" },
      'Multi Kills':    { icon: "💥", color: "#d040a0" },
      'Revenge Kills':  { icon: "🔥", color: "#e06020" },
      'Explosive Kills':{ icon: "💣", color: "#e0a020" },
      'Sniper Kills':   { icon: "🎯", color: "#c06050" },
      'Critical Kills': { icon: "⚡", color: "#e0c040" },
      'Kill Streaks':   { icon: "🔥", color: "#ff5030" },
    },
  },
  Sparring: {
    color: "#60c0e0", icon: "🔫",
    skills: {
      'Duels Played':  { icon: "🎮", color: "#50b0d0" },
      'Duels Won':     { icon: "🏅", color: "#60c0e0" },
      'Win Rate':      { icon: "📊", color: "#70d0e0" },
      'Combos Landed': { icon: "👊", color: "#c080e0" },
      Parries:         { icon: "🛡", color: "#80b0c0" },
      'Ring Outs':     { icon: "🏟", color: "#40c0a0" },
    },
  },
  Basing: {
    color: "#c08040", icon: "🏠",
    skills: {
      'Walls Built':    { icon: "🧱", color: "#a08060" },
      'Turrets Placed': { icon: "🔫", color: "#80a060" },
      'Repairs Done':   { icon: "🔧", color: "#6090c0" },
      'Raids Defended': { icon: "🏠", color: "#c07040" },
    },
  },
  Dungeons: {
    color: "#7080e0", icon: "🏰",
    skills: {
      'Floor Clearing': { icon: "🏰", color: "#7080e0" },
      'Boss Slaying':   { icon: "💀", color: "#e04040" },
      'Trap Dodging':   { icon: "⚡", color: "#e0c040" },
      'Chest Looting':  { icon: "📦", color: "#c8a040" },
      'Speed Runs':     { icon: "⏱", color: "#50e0a0" },
      'No Death Runs':  { icon: "💎", color: "#a080e0" },
      'Wave Surviving': { icon: "🌊", color: "#4090e0" },
      'Secret Rooms':   { icon: "🚪", color: "#c070a0" },
      'Mini Bosses':    { icon: "👹", color: "#e06060" },
      'Dungeon Escapes':{ icon: "🏃", color: "#60d080" },
    },
  },
  Events: {
    color: "#ffc040", icon: "🏆",
    skills: {
      'Games Played':    { icon: "🎮", color: "#d0a040" },
      'Events Won':      { icon: "🏅", color: "#ffd050" },
      Tournaments:       { icon: "🏆", color: "#ffc040" },
      Races:             { icon: "🏁", color: "#40e080" },
      Survival:          { icon: "💀", color: "#e05070" },
      'Team Battles':    { icon: "⚔", color: "#60a0e0" },
      'Puzzles Solved':  { icon: "🧩", color: "#a0c050" },
      'Hide N Seek':     { icon: "👀", color: "#c080d0" },
      'Capture Flag':    { icon: "🚩", color: "#e06040" },
      'King of Hill':    { icon: "👑", color: "#ffd040" },
      'Tag Games':       { icon: "🏃", color: "#50d0a0" },
      'Obstacle Course': { icon: "🏋", color: "#d08040" },
      'Treasure Hunt':   { icon: "🗺", color: "#c0a030" },
      'Dance Off':       { icon: "💃", color: "#e060c0" },
    },
  },
  Jobs: {
    color: typeof PALETTE !== 'undefined' ? PALETTE.accent : "#60c0a0", icon: "💼",
    skills: {
      Mining:          { icon: "⛏", color: "#c8a040" },
      Digging:         { icon: "⚒", color: "#a07040" },
      Farming:         { icon: "🌾", color: "#60c040" },
      Mailing:         { icon: "✉", color: "#60a0e0" },
      Fishing:         { icon: "🎣", color: "#40b0c0" },
      Brewing:         { icon: "🧪", color: "#b060c0" },
      Cooking:         { icon: "🍳", color: "#e0a040" },
      Breeding:        { icon: "🐣", color: "#e0c060" },
      'Taxi Driving':  { icon: "🚕", color: "#e0d040" },
      Woodcutting:     { icon: "🪓", color: "#8a6a3a" },
    },
  },
};

// ---- Derived lookups (backward compatible with all consumers) ----
const SKILL_CATEGORIES = {};
const SKILL_ICONS = {};
const SKILL_COLORS = {};
const CAT_COLORS = {};
const CAT_ICONS = {};
const ALL_SKILLS = [];

for (const [cat, data] of Object.entries(SKILL_REGISTRY)) {
  const skillNames = Object.keys(data.skills);
  SKILL_CATEGORIES[cat] = skillNames;
  CAT_COLORS[cat] = data.color;
  CAT_ICONS[cat] = data.icon;
  for (const [skill, meta] of Object.entries(data.skills)) {
    SKILL_ICONS[skill] = meta.icon;
    SKILL_COLORS[skill] = meta.color;
    ALL_SKILLS.push(skill);
  }
}
