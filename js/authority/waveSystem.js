// ===================== WAVE SYSTEM =====================
// Authority: wave composition, spawning, phase logic
// Extracted from index_2.html — Phase B

// ===================== DUNGEON WAVE SYSTEM =====================

// Events → js/authority/eventBus.js

// StatusFX, MOB_AI, MOB_SPECIALS → js/authority/combatSystem.js

// HIT_EFFECT_RENDERERS → js/client/rendering/hitEffects.js

// ITEM_CATEGORIES, PALETTE, ITEM_STAT_RENDERERS → js/shared/itemData.js

// wave, mobs, waveState → js/authority/gameState.js
let waveTimer = 0;
// kills → js/authority/gameState.js
let spars = 0;
let playerFaction = "Wild West";
let playerGender = "Male";
let genderPopupOpen = false; // unused, kept for compat
let relationshipPopupOpen = false;
let factionPopupOpen = false;
let countryPopupOpen = false;
let countryScroll = 0;
let languagePopupOpen = false;
let languageScroll = 0;
let playerCountry = "United States";

const COUNTRIES = [
  {n:"Afghanistan",f:"🇦🇫"},{n:"Albania",f:"🇦🇱"},{n:"Algeria",f:"🇩🇿"},{n:"Andorra",f:"🇦🇩"},{n:"Angola",f:"🇦🇴"},
  {n:"Argentina",f:"🇦🇷"},{n:"Armenia",f:"🇦🇲"},{n:"Australia",f:"🇦🇺"},{n:"Austria",f:"🇦🇹"},{n:"Azerbaijan",f:"🇦🇿"},
  {n:"Bahamas",f:"🇧🇸"},{n:"Bahrain",f:"🇧🇭"},{n:"Bangladesh",f:"🇧🇩"},{n:"Barbados",f:"🇧🇧"},{n:"Belarus",f:"🇧🇾"},
  {n:"Belgium",f:"🇧🇪"},{n:"Belize",f:"🇧🇿"},{n:"Benin",f:"🇧🇯"},{n:"Bhutan",f:"🇧🇹"},{n:"Bolivia",f:"🇧🇴"},
  {n:"Bosnia",f:"🇧🇦"},{n:"Botswana",f:"🇧🇼"},{n:"Brazil",f:"🇧🇷"},{n:"Brunei",f:"🇧🇳"},{n:"Bulgaria",f:"🇧🇬"},
  {n:"Burkina Faso",f:"🇧🇫"},{n:"Burundi",f:"🇧🇮"},{n:"Cambodia",f:"🇰🇭"},{n:"Cameroon",f:"🇨🇲"},{n:"Canada",f:"🇨🇦"},
  {n:"Chad",f:"🇹🇩"},{n:"Chile",f:"🇨🇱"},{n:"China",f:"🇨🇳"},{n:"Colombia",f:"🇨🇴"},{n:"Congo",f:"🇨🇬"},
  {n:"Costa Rica",f:"🇨🇷"},{n:"Croatia",f:"🇭🇷"},{n:"Cuba",f:"🇨🇺"},{n:"Cyprus",f:"🇨🇾"},{n:"Czech Republic",f:"🇨🇿"},
  {n:"Denmark",f:"🇩🇰"},{n:"Djibouti",f:"🇩🇯"},{n:"Dominican Republic",f:"🇩🇴"},{n:"Ecuador",f:"🇪🇨"},{n:"Egypt",f:"🇪🇬"},
  {n:"El Salvador",f:"🇸🇻"},{n:"Estonia",f:"🇪🇪"},{n:"Ethiopia",f:"🇪🇹"},{n:"Fiji",f:"🇫🇯"},{n:"Finland",f:"🇫🇮"},
  {n:"France",f:"🇫🇷"},{n:"Gabon",f:"🇬🇦"},{n:"Gambia",f:"🇬🇲"},{n:"Georgia",f:"🇬🇪"},{n:"Germany",f:"🇩🇪"},
  {n:"Ghana",f:"🇬🇭"},{n:"Greece",f:"🇬🇷"},{n:"Guatemala",f:"🇬🇹"},{n:"Guinea",f:"🇬🇳"},{n:"Guyana",f:"🇬🇾"},
  {n:"Haiti",f:"🇭🇹"},{n:"Honduras",f:"🇭🇳"},{n:"Hungary",f:"🇭🇺"},{n:"Iceland",f:"🇮🇸"},{n:"India",f:"🇮🇳"},
  {n:"Indonesia",f:"🇮🇩"},{n:"Iran",f:"🇮🇷"},{n:"Iraq",f:"🇮🇶"},{n:"Ireland",f:"🇮🇪"},{n:"Israel",f:"🇮🇱"},
  {n:"Italy",f:"🇮🇹"},{n:"Jamaica",f:"🇯🇲"},{n:"Japan",f:"🇯🇵"},{n:"Jordan",f:"🇯🇴"},{n:"Kazakhstan",f:"🇰🇿"},
  {n:"Kenya",f:"🇰🇪"},{n:"Kuwait",f:"🇰🇼"},{n:"Laos",f:"🇱🇦"},{n:"Latvia",f:"🇱🇻"},{n:"Lebanon",f:"🇱🇧"},
  {n:"Libya",f:"🇱🇾"},{n:"Lithuania",f:"🇱🇹"},{n:"Luxembourg",f:"🇱🇺"},{n:"Madagascar",f:"🇲🇬"},{n:"Malaysia",f:"🇲🇾"},
  {n:"Mali",f:"🇲🇱"},{n:"Malta",f:"🇲🇹"},{n:"Mexico",f:"🇲🇽"},{n:"Moldova",f:"🇲🇩"},{n:"Monaco",f:"🇲🇨"},
  {n:"Mongolia",f:"🇲🇳"},{n:"Montenegro",f:"🇲🇪"},{n:"Morocco",f:"🇲🇦"},{n:"Mozambique",f:"🇲🇿"},{n:"Myanmar",f:"🇲🇲"},
  {n:"Nepal",f:"🇳🇵"},{n:"Netherlands",f:"🇳🇱"},{n:"New Zealand",f:"🇳🇿"},{n:"Nicaragua",f:"🇳🇮"},{n:"Niger",f:"🇳🇪"},
  {n:"Nigeria",f:"🇳🇬"},{n:"North Korea",f:"🇰🇵"},{n:"Norway",f:"🇳🇴"},{n:"Oman",f:"🇴🇲"},{n:"Pakistan",f:"🇵🇰"},
  {n:"Palestine",f:"🇵🇸"},{n:"Panama",f:"🇵🇦"},{n:"Paraguay",f:"🇵🇾"},{n:"Peru",f:"🇵🇪"},{n:"Philippines",f:"🇵🇭"},
  {n:"Poland",f:"🇵🇱"},{n:"Portugal",f:"🇵🇹"},{n:"Qatar",f:"🇶🇦"},{n:"Romania",f:"🇷🇴"},{n:"Russia",f:"🇷🇺"},
  {n:"Rwanda",f:"🇷🇼"},{n:"Saudi Arabia",f:"🇸🇦"},{n:"Senegal",f:"🇸🇳"},{n:"Serbia",f:"🇷🇸"},{n:"Singapore",f:"🇸🇬"},
  {n:"Slovakia",f:"🇸🇰"},{n:"Slovenia",f:"🇸🇮"},{n:"Somalia",f:"🇸🇴"},{n:"South Africa",f:"🇿🇦"},{n:"South Korea",f:"🇰🇷"},
  {n:"Spain",f:"🇪🇸"},{n:"Sri Lanka",f:"🇱🇰"},{n:"Sudan",f:"🇸🇩"},{n:"Sweden",f:"🇸🇪"},{n:"Switzerland",f:"🇨🇭"},
  {n:"Syria",f:"🇸🇾"},{n:"Taiwan",f:"🇹🇼"},{n:"Tanzania",f:"🇹🇿"},{n:"Thailand",f:"🇹🇭"},{n:"Trinidad",f:"🇹🇹"},
  {n:"Tunisia",f:"🇹🇳"},{n:"Turkey",f:"🇹🇷"},{n:"Uganda",f:"🇺🇬"},{n:"Ukraine",f:"🇺🇦"},{n:"United Arab Emirates",f:"🇦🇪"},
  {n:"United Kingdom",f:"🇬🇧"},{n:"United States",f:"🇺🇸"},{n:"Uruguay",f:"🇺🇾"},{n:"Uzbekistan",f:"🇺🇿"},{n:"Venezuela",f:"🇻🇪"},
  {n:"Vietnam",f:"🇻🇳"},{n:"Yemen",f:"🇾🇪"},{n:"Zambia",f:"🇿🇲"},{n:"Zimbabwe",f:"🇿🇼"},
];

const LANGUAGES = [
  {n:"English",f:"🇬🇧"},{n:"Spanish",f:"🇪🇸"},{n:"French",f:"🇫🇷"},{n:"German",f:"🇩🇪"},
  {n:"Italian",f:"🇮🇹"},{n:"Portuguese",f:"🇵🇹"},{n:"Dutch",f:"🇳🇱"},{n:"Russian",f:"🇷🇺"},
  {n:"Japanese",f:"🇯🇵"},{n:"Korean",f:"🇰🇷"},{n:"Chinese",f:"🇨🇳"},{n:"Arabic",f:"🇸🇦"},
  {n:"Hindi",f:"🇮🇳"},{n:"Turkish",f:"🇹🇷"},{n:"Polish",f:"🇵🇱"},{n:"Swedish",f:"🇸🇪"},
  {n:"Norwegian",f:"🇳🇴"},{n:"Danish",f:"🇩🇰"},{n:"Finnish",f:"🇫🇮"},{n:"Greek",f:"🇬🇷"},
  {n:"Czech",f:"🇨🇿"},{n:"Romanian",f:"🇷🇴"},{n:"Hungarian",f:"🇭🇺"},{n:"Thai",f:"🇹🇭"},
  {n:"Vietnamese",f:"🇻🇳"},{n:"Indonesian",f:"🇮🇩"},{n:"Malay",f:"🇲🇾"},{n:"Tagalog",f:"🇵🇭"},
  {n:"Ukrainian",f:"🇺🇦"},{n:"Bulgarian",f:"🇧🇬"},{n:"Croatian",f:"🇭🇷"},{n:"Serbian",f:"🇷🇸"},
  {n:"Slovak",f:"🇸🇰"},{n:"Slovenian",f:"🇸🇮"},{n:"Estonian",f:"🇪🇪"},{n:"Latvian",f:"🇱🇻"},
  {n:"Lithuanian",f:"🇱🇹"},{n:"Hebrew",f:"🇮🇱"},{n:"Persian",f:"🇮🇷"},{n:"Urdu",f:"🇵🇰"},
  {n:"Bengali",f:"🇧🇩"},{n:"Tamil",f:"🇮🇳"},{n:"Swahili",f:"🇰🇪"},{n:"Afrikaans",f:"🇿🇦"},
  {n:"Catalan",f:"🇪🇸"},{n:"Icelandic",f:"🇮🇸"},{n:"Maltese",f:"🇲🇹"},{n:"Albanian",f:"🇦🇱"},
  {n:"Nepali",f:"🇳🇵"},{n:"Burmese",f:"🇲🇲"},{n:"Khmer",f:"🇰🇭"},{n:"Lao",f:"🇱🇦"},
  {n:"Georgian",f:"🇬🇪"},{n:"Armenian",f:"🇦🇲"},{n:"Mongolian",f:"🇲🇳"},{n:"Amharic",f:"🇪🇹"},
  {n:"Somali",f:"🇸🇴"},{n:"Hausa",f:"🇳🇬"},{n:"Yoruba",f:"🇳🇬"},{n:"Zulu",f:"🇿🇦"},
  {n:"Maori",f:"🇳🇿"},{n:"Welsh",f:"🏴󠁧󠁢󠁷󠁬󠁳󠁿"},{n:"Irish",f:"🇮🇪"},{n:"Basque",f:"🇪🇸"},
  {n:"Galician",f:"🇪🇸"},{n:"Filipino",f:"🇵🇭"},{n:"Haitian",f:"🇭🇹"},{n:"Kazakh",f:"🇰🇿"},
  {n:"Uzbek",f:"🇺🇿"},{n:"Azerbaijani",f:"🇦🇿"},{n:"Pashto",f:"🇦🇫"},{n:"Kurdish",f:"🇮🇶"},
  {n:"Sinhala",f:"🇱🇰"},{n:"Bosnian",f:"🇧🇦"},{n:"Macedonian",f:"🇲🇰"},{n:"Luxembourgish",f:"🇱🇺"},
];
// Phase system: 3 phases per wave (except boss waves)
let currentPhase = 1;       // 1, 2, or 3
let phaseMaxMobs = 0;       // how many mobs were in the current phase's spawn
let phaseMobsKilled = 0;    // how many of this phase's mobs have been killed
let phaseTriggered = [false, false, false]; // track which phases have spawned
function resetPhaseState() {
  currentPhase = 1; phaseMaxMobs = 0; phaseMobsKilled = 0;
  phaseTriggered = [false, false, false];
}
let playerLevel = 1;
let playerXP = 0;
const PLAYER_MAX_LEVEL = 1000;

// XP required for a given level (exponential curve)
function xpForLevel(lvl) { return Math.floor(50 * Math.pow(1.08, lvl - 1)); }
// Total XP needed to go from lvl to lvl+1
function xpToNextLevel(lvl) { return xpForLevel(lvl); }

// Skills system
// Skill categories
const SKILL_CATEGORIES = {
  Killing: ['Total Kills', 'Deaths', 'K/D Ratio', 'Melee Kills', 'Gun Kills', 'Headshots', 'Multi Kills', 'Revenge Kills', 'Explosive Kills', 'Sniper Kills', 'Critical Kills', 'Kill Streaks'],
  Sparring: ['Duels Played', 'Duels Won', 'Win Rate', 'Combos Landed', 'Parries', 'Ring Outs'],
  Basing: ['Walls Built', 'Turrets Placed', 'Repairs Done', 'Raids Defended'],
  Dungeons: ['Floor Clearing', 'Boss Slaying', 'Trap Dodging', 'Chest Looting', 'Speed Runs', 'No Death Runs', 'Wave Surviving', 'Secret Rooms', 'Mini Bosses', 'Dungeon Escapes'],
  Events: ['Games Played', 'Events Won', 'Tournaments', 'Races', 'Survival', 'Team Battles', 'Puzzles Solved', 'Hide N Seek', 'Capture Flag', 'King of Hill', 'Tag Games', 'Obstacle Course', 'Treasure Hunt', 'Dance Off'],
  Jobs: ['Mining', 'Digging', 'Farming', 'Mailing', 'Fishing', 'Brewing', 'Cooking', 'Breeding', 'Taxi Driving', 'Woodcutting'],
};
const ALL_SKILLS = [];
for (const cat in SKILL_CATEGORIES) { for (const s of SKILL_CATEGORIES[cat]) ALL_SKILLS.push(s); }
const skillData = {};
for (const s of ALL_SKILLS) { skillData[s] = { level: 1, xp: 0 }; }

// XP needed for a skill level (same curve per skill)
function skillXpForLevel(lvl) { return Math.floor(80 * Math.pow(1.12, lvl - 1)); }

// Add XP to a skill — also contributes to overall player level
function addSkillXP(skillName, amount) {
  const sk = skillData[skillName];
  if (!sk) return;
  sk.xp += amount;
  // Level up skill (no cap)
  while (sk.xp >= skillXpForLevel(sk.level)) {
    sk.xp -= skillXpForLevel(sk.level);
    sk.level++;
  }
  // Also add to player XP
  addPlayerXP(amount);
}

// Add XP directly to player level
function addPlayerXP(amount) {
  if (playerLevel >= PLAYER_MAX_LEVEL) return;
  playerXP += amount;
  while (playerXP >= xpToNextLevel(playerLevel) && playerLevel < PLAYER_MAX_LEVEL) {
    playerXP -= xpToNextLevel(playerLevel);
    playerLevel++;
  }
  if (playerLevel >= PLAYER_MAX_LEVEL) playerXP = 0;
}

// Stats panel open state
let statsPanelOpen = false;
let statsTab = 'Killing'; // active category tab
let statsScroll = 0; // scroll offset for skills list
let gameFrame = 0; // global frame counter for quick-kill bonus
// dungeonFloor → js/authority/gameState.js
const WAVES_PER_FLOOR = 10;
const MAX_FLOORS = 5;
let stairsOpen = false; // true after completing WAVES_PER_FLOOR on current floor
let stairsAppearTimer = 0; // 0-1 animation progress for rising from ground

// Each floor's staircase has a unique color theme
const STAIR_COLORS = [
  { base: [160,100,255], glow: [200,160,255], name: "Arcane" },    // Floor 1 → 2: purple
  { base: [100,200,255], glow: [140,220,255], name: "Frost" },     // Floor 2 → 3: cyan/ice
  { base: [255,160,60],  glow: [255,200,100], name: "Ember" },     // Floor 3 → 4: orange/fire
  { base: [60,220,120],  glow: [100,255,160], name: "Verdant" },   // Floor 4 → 5: green
  { base: [255,215,0],   glow: [255,240,100], name: "Victory" },   // Floor 5 exit: gold
];
let dungeonComplete = false; // true after clearing floor 5 wave 10
let victoryTimer = 0; // frames since dungeon complete for celebration

// Medpacks — spawn 1-2 per wave at random walkable tiles
// medpacks → js/authority/gameState.js
const MEDPACK_HEAL = 30;
const MEDPACK_PICKUP_RANGE = 40;

function spawnMedpacks() {
  if (!Scene.inDungeon) return; // dungeon only
  const toSpawn = 2; // always spawn 2 per phase
  for (let i = 0; i < toSpawn; i++) {
    let attempts = 0, px, py;
    do {
      const tx = 6 + Math.floor(Math.random() * (level.widthTiles - 12));
      const ty = 6 + Math.floor(Math.random() * (level.heightTiles - 12));
      if (!isSolid(tx, ty)) {
        px = tx * TILE + TILE / 2;
        py = ty * TILE + TILE / 2;
        break;
      }
      attempts++;
    } while (attempts < 50);
    if (px !== undefined) {
      medpacks.push({ x: px, y: py, bobFrame: Math.random() * 100 });
    }
  }
}

function updateMedpacks() {
  for (let i = medpacks.length - 1; i >= 0; i--) {
    const mp = medpacks[i];
    mp.bobFrame++;
    const dx = player.x - mp.x;
    const dy = (player.y - 20) - mp.y;
    if (dx * dx + dy * dy < MEDPACK_PICKUP_RANGE * MEDPACK_PICKUP_RANGE) {
      const heal = Math.min(MEDPACK_HEAL, player.maxHp - player.hp);
      if (heal > 0) {
        player.hp += heal;
        hitEffects.push({ x: mp.x, y: mp.y - 10, life: 20, type: "heal", dmg: heal });
      }
      medpacks.splice(i, 1);
    }
  }
}

function drawMedpacks() {
  for (const mp of medpacks) {
    const bob = Math.sin(mp.bobFrame * 0.06) * 3;
    const my = mp.y + bob;
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(mp.x, mp.y + 14, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
    // Glow
    const glow = 0.15 + 0.08 * Math.sin(mp.bobFrame * 0.08);
    ctx.fillStyle = `rgba(60,220,80,${glow})`;
    ctx.beginPath(); ctx.arc(mp.x, my, 28, 0, Math.PI * 2); ctx.fill();
    // White box
    ctx.fillStyle = "#eee";
    ctx.beginPath(); ctx.roundRect(mp.x - 17, my - 17, 34, 34, 4); ctx.fill();
    // Red border
    ctx.strokeStyle = "#cc2222";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(mp.x - 17, my - 17, 34, 34, 4); ctx.stroke();
    // Red cross
    ctx.fillStyle = "#cc2222";
    ctx.fillRect(mp.x - 4, my - 12, 8, 24);
    ctx.fillRect(mp.x - 12, my - 4, 24, 8);
  }
}

// Quick-kill bonus: 20% more gold/HP if killed within 5 seconds of spawning
function getQuickKillBonus(mob) {
  const aliveFrames = gameFrame - (mob.spawnFrame || 0);
  if (aliveFrames < 300) return 1.2; // killed within 5 seconds = 20% bonus
  return 1.0;
}
// gold → js/authority/gameState.js

// Gold reward per mob type (base, scales with wave)
function getGoldReward(type, waveNum) {
  // Base gold per mob type
  const rewards = { grunt: 2, runner: 3, tank: 6, witch: 7, skeleton: 0, golem: 30, mini_golem: 5, mummy: 3, archer: 4, healer: 5 };
  const base = type in rewards ? rewards[type] : 2;
  const globalWave = (dungeonFloor - 1) * WAVES_PER_FLOOR + waveNum;
  // Floor 1 gets a generous 1.8x bonus, tapering off on later floors
  // Floor 1: 1.8x, Floor 2: 1.3x, Floor 3: 1.1x, Floor 4: 1.0x, Floor 5: 1.0x
  const floorBonus = dungeonFloor === 1 ? 1.8 : dungeonFloor === 2 ? 1.3 : dungeonFloor === 3 ? 1.1 : 1.0;
  return Math.round(base * (1 + (globalWave - 1) * 0.07) * floorBonus * 0.5);
}
let contactCooldown = 0; // frames of invulnerability after contact hit
let lives = 3;
let activeSlot = 0; // 0 = gun, 1 = katana
let isGrabbing = false;
let grabTimer = 0;
let grabTarget = null; // mob being grabbed
let grabCooldown = 0;
const GRAB_RANGE = 60;
const GRAB_DURATION = 40; // frames holding grab
const GRAB_COOLDOWN = 0; // no wait between grabs

// Hotbar hold-to-inspect system
let hotbarHoldSlot = -1;
let hotbarHoldTime = 0;
const HOTBAR_HOLD_THRESHOLD = 180; // 3 seconds at 60fps
let showWeaponStats = false;

// Extra hotbar item slot
let extraSlotItem = null; // item equipped in slot 4

