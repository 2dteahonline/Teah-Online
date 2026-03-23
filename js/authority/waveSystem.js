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

// Skills system — SKILL_CATEGORIES, ALL_SKILLS now in js/shared/skillRegistry.js
const skillData = {};
for (const s of ALL_SKILLS) { skillData[s] = { level: 1, xp: 0 }; }

// Dungeon Level — derived stat for entry gating. Never stored, always computed.
function getDungeonLevel() {
  // Gun progression score: sum of (tier * 25 + level) across all guns
  let gunScore = 0;
  if (typeof window._gunLevels !== 'undefined') {
    for (const gunId in window._gunLevels) {
      const v = window._gunLevels[gunId];
      if (v && typeof v === 'object') {
        gunScore += v.tier * 25 + v.level;
      } else if (typeof v === 'number' && v > 0) {
        gunScore += v; // old integer format
      }
    }
  }
  // Kill skill level
  const killsLevel = skillData['Total Kills'] ? skillData['Total Kills'].level : 1;
  // Weighted formula
  const raw = gunScore * 0.4 + killsLevel * 0.35 + playerLevel * 0.25;
  return Math.max(1, Math.min(100, Math.floor(raw)));
}

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
  // Auto-save progression on XP gain (debounced)
  SaveLoad.autoSave();
}

// Stats panel open state
let statsPanelOpen = false;
let statsTab = 'Killing'; // active category tab
let statsScroll = 0; // scroll offset for skills list
let gameFrame = 0; // global frame counter for quick-kill bonus
// dungeonFloor → js/authority/gameState.js
const WAVES_PER_FLOOR = 10;
const MAX_FLOORS = 5; // legacy alias — use getDungeonMaxFloors() for multi-dungeon support
// DUNGEON_MAX_FLOORS removed — use DUNGEON_REGISTRY instead (js/shared/dungeonRegistry.js)
function getDungeonMaxFloors() {
  const entry = typeof DUNGEON_REGISTRY !== 'undefined' && DUNGEON_REGISTRY[currentDungeon];
  return entry ? entry.maxFloors : 5;
}
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
    // Check all party members (or just player in solo)
    const _mpTargets = PartySystem.getAliveEntities();
    let _mpPickedUp = false;
    for (const _mpt of _mpTargets) {
      const dx = _mpt.x - mp.x;
      const dy = (_mpt.y - 20) - mp.y;
      if (dx * dx + dy * dy < MEDPACK_PICKUP_RANGE * MEDPACK_PICKUP_RANGE) {
        const heal = Math.min(MEDPACK_HEAL, _mpt.maxHp - _mpt.hp);
        if (heal > 0) {
          _mpt.hp += heal;
          hitEffects.push({ x: mp.x, y: mp.y - 10, life: 20, type: "heal", dmg: heal });
        }
        _mpPickedUp = true;
        break;
      }
    }
    if (_mpPickedUp) medpacks.splice(i, 1);
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

// Gold reward per mob type — reads base gold from MOB_TYPES.goldReward, scales with wave
function getGoldReward(type, waveNum) {
  const mt = MOB_TYPES[type];
  const base = mt && mt.goldReward != null ? mt.goldReward : 2;
  const globalWave = (dungeonFloor - 1) * WAVES_PER_FLOOR + waveNum;
  // Floor 1: 1.8x, Floor 2: 1.3x, Floor 3: 1.1x, Floor 4-5: 1.0x
  const floorBonus = dungeonFloor === 1 ? 1.8 : dungeonFloor === 2 ? 1.3 : dungeonFloor === 3 ? 1.1 : 1.0;
  const dungeonMult = (typeof DUNGEON_REGISTRY !== 'undefined' && DUNGEON_REGISTRY[currentDungeon] && DUNGEON_REGISTRY[currentDungeon].rewardMult) || 1.0;
  return Math.round(base * (1 + (globalWave - 1) * 0.07) * floorBonus * 0.5 * dungeonMult);
}
let contactCooldown = 0; // frames of invulnerability after contact hit
let lives = 3;
let activeSlot = 0; // 0 = gun, 1 = katana
let activeHotbarSlot = 0; // which hotbar slot to visually highlight (can differ from activeSlot when quickslots remap)
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

// ===================== WAVE SCALING, COMPOSITION, SPAWNING =====================
// Moved from inventorySystem.js — these belong with wave logic

// Wave XP multiplier (for mob HP/speed scaling only)

// Wave scaling — harder per wave since fewer mobs
function getMobCountForWave(w) {
  // More mobs on higher floors
  const base = Math.min(5 + Math.floor(w * 1.0), 14);
  const floorBonus = Math.floor((dungeonFloor - 1) * 2); // +2 mobs per floor
  let count = Math.min(base + floorBonus, 22); // cap at 22
  // Party scaling: more mobs for larger parties
  if (typeof PartySystem !== 'undefined' && PartyState.members.length > 1) {
    count = Math.round(count * PartySystem.getMobCountScale());
  }
  return count;
}
function getWaveHPMultiplier(w) {
  // Exponential floor scaling: floor 1=1x, 2=2.2x, 3=5x, 4=11x, 5=25x
  const floorMult = Math.pow(2.2, dungeonFloor - 1);
  // +12% HP per wave within each floor
  let mult = (1 + (w - 1) * 0.12) * floorMult;
  // Party scaling: modest HP bump
  if (typeof PartySystem !== 'undefined' && PartyState.members.length > 1) {
    mult *= PartySystem.getMobHPScale();
  }
  return mult;
}
function getWaveSpeedMultiplier(w) {
  // Speed also scales with floor (but capped by capMobSpeed)
  const floorSpd = 1 + (dungeonFloor - 1) * 0.15;
  return (1 + (w - 1) * 0.06) * floorSpd;
}
// Mob damage also scales with floor
function getMobDamageMultiplier() {
  // Floor 1=1x, 2=1.5x, 3=2.2x, 4=3.2x, 5=4.5x
  const f = Math.max(1, dungeonFloor) - 1;
  return 1 + f * 0.7 + Math.pow(f, 1.5) * 0.2;
}
// Speed caps: runner max 1.5x player speed, everything else max 0.95x
function capMobSpeed(type, speed) {
  const playerSpeed = player.baseSpeed || GAME_CONFIG.PLAYER_BASE_SPEED;
  if (type === "runner") return Math.min(speed, playerSpeed * 1.1);
  return Math.min(speed, playerSpeed * 0.85);
}

// ===================== FLOOR-AWARE WAVE COMPOSITION =====================
// All dungeons use FLOOR_CONFIG (keyed by dungeon type then floor number).
function getWaveComposition(w) {
  const dungeonConfig = typeof FLOOR_CONFIG !== 'undefined' && FLOOR_CONFIG[currentDungeon];
  if (dungeonConfig && dungeonConfig[dungeonFloor]) {
    const floorComp = getFloorWaveComposition(dungeonConfig[dungeonFloor], w);
    if (floorComp) return floorComp;
  }
  // Fallback: generic grunt wave (should never hit if FLOOR_CONFIG is complete)
  console.warn('No FLOOR_CONFIG for', currentDungeon, 'floor', dungeonFloor);
  return { primary: [{type:'grunt',weight:1}], support: [], primaryPct: 1.0, theme: 'Wave ' + w };
}

// ===================== MOB FACTORY =====================
// Creates a fully initialized mob instance from a type key + position + scaling.
// Eliminates the ~80 lines of duplicated property copying in spawnPhase.
function createMob(typeKey, x, y, hpMult, spdMult, opts = {}) {
  const mt = MOB_TYPES[typeKey];
  if (!mt) return null;

  let mobHp = Math.round(mt.hp * hpMult);
  if (typeKey === 'witch') mobHp = Math.round(MOB_TYPES.tank.hp * 1.2 * hpMult);
  if (typeKey === 'golem') mobHp = Math.round(mt.hp * hpMult * 1.5);
  if (mt.isBoss && opts.bossHPMult) mobHp = Math.round(mobHp * opts.bossHPMult);

  const mobId = nextMobId++;
  const speedCap = typeKey === 'runner' || (mt.ai === 'runner')
    ? Math.min(mt.speed * spdMult, (player.baseSpeed || GAME_CONFIG.PLAYER_BASE_SPEED) * 1.1)
    : capMobSpeed(typeKey, mt.speed * spdMult);

  // Determine visual scale
  let scale = 1.0;
  if (mt.bossScale) scale = mt.bossScale;
  else if (typeKey === 'tank' || mt.ai === 'tank') scale = 1.3;
  else if (typeKey === 'witch') scale = 1.1;
  else if (typeKey === 'golem') scale = 1.6;

  const mob = {
    x, y, type: typeKey, id: mobId,
    hp: mobHp, maxHp: mobHp,
    speed: speedCap,
    damage: Math.round(mt.damage * getMobDamageMultiplier()),
    contactRange: mt.contactRange || 76,
    // Physics / collision (per-mob with GAME_CONFIG fallbacks)
    radius: mt.radius ?? GAME_CONFIG.MOB_RADIUS,
    wallHW: mt.wallHW ?? GAME_CONFIG.MOB_WALL_HW,
    hitboxR: mt.hitboxR ?? GAME_CONFIG.ENTITY_R,
    ai: mt.ai || null,
    kiteRange: mt.kiteRange || 160,
    // Visual
    skin: mt.skin, hair: mt.hair, shirt: mt.shirt, pants: mt.pants,
    name: mt.name, dir: 0, frame: 0, attackCooldown: 0,
    // Shooter ranged
    shootRange: mt.shootRange || 0, shootRate: mt.shootRate || 0,
    shootTimer: mt.shootRate ? Math.floor(Math.random() * mt.shootRate) : 0,
    bulletSpeed: mt.bulletSpeed || 0,
    // Witch summoning
    summonRate: mt.summonRate || 0, summonMax: mt.summonMax || 0,
    summonTimer: mt.summonRate ? Math.floor(mt.summonRate * 0.5) : 0,
    witchId: 0, boneSwing: 0, castTimer: 0,
    // Visual
    scale, spawnFrame: gameFrame,
    // Golem boulders
    boulderRate: mt.boulderRate || 0, boulderSpeed: mt.boulderSpeed || 0,
    boulderRange: mt.boulderRange || 0,
    boulderTimer: mt.boulderRate ? Math.floor(mt.boulderRate * 0.3) : 0, throwAnim: 0,
    // Mummy
    explodeRange: mt.explodeRange || 0,
    explodeDamage: Math.round((mt.explodeDamage || 0) * getMobDamageMultiplier()),
    fuseMin: mt.fuseMin || 0, fuseMax: mt.fuseMax || 0,
    mummyArmed: false, mummyFuse: 0, mummyFlash: 0,
    // Archer
    arrowRate: mt.arrowRate || 0, arrowSpeed: mt.arrowSpeed || 0,
    arrowRange: mt.arrowRange || 0, arrowBounces: mt.arrowBounces || 0,
    arrowLife: mt.arrowLife || 0, bowDrawAnim: 0,
    arrowTimer: mt.arrowRate ? Math.max(1, Math.floor(Math.random() * mt.arrowRate)) : 0,
    projectileStyle: mt.projectileStyle || null,
    bulletColor: mt.bulletColor || null,
    // Healer
    healRadius: mt.healRadius || 0, healRate: mt.healRate || 0,
    healAmount: mt.healAmount || 0,
    healTimer: mt.healRate ? Math.floor(mt.healRate * 0.5) : 0, healAnim: 0,
    healZoneX: 0, healZoneY: 0,
    // Floor special system
    _specials: mt._specials || null,  // array of special ability keys
    _specialTimer: mt.specialCD || 0, // single-special cooldown
    _specialCD: mt.specialCD || 0,    // base cooldown value
    _abilityCDs: {},                  // multi-ability cooldown map (for bosses)
    _cloaked: false,                  // for cloak_backstab
    _cloakTimer: 0,
    _bombs: [],                       // for sticky_bomb
    _mines: [],                       // for smart_mine
    _summonOwnerId: 0,                // tracks boss summons
    _shieldHp: 0,                     // shield absorb (scavenge_shield, nano_armor, golden_parachute)
    _shieldExpireFrame: 0,            // auto-expire frame for timed shields
    _invulnerable: false,             // invulnerability flag (mud_dive, etc.)
    _submerged: false,                // for mud_dive
    _turrets: [],                     // for briefcase_turret
    _drones: [],                      // for drone_swarm
    _pillars: [],                     // for tesla_pillars
    _eggs: [],                        // for toxic_nursery
    _traps: [],                       // for tripwire
    _lasers: [],                      // for puzzle_lasers
    _baits: [],                       // for loot_bait
    _staticOrbs: [],                  // for static_orbs
    _summonedMinions: [],             // for summon_elite
    _canSplit: mt._canSplit || false,  // for core_guardian split
    _splitDone: false,                // tracks if split already happened
    _frontalShield: mt._frontalShield || false, // permanent frontal damage block
    _damageReduction: mt._damageReduction || 0,       // passive % damage reduction
    _contactDamageAura: mt._contactDamageAura || null, // { range, damage } DoT aura
    _deathExplosion: mt._deathExplosion || null,       // { radius, damage } AoE on death
    _counterStance: mt._counterStance || false,        // reflects melee damage
    _poisonImmune: mt._poisonImmune || false,
    _lethalEfficiency: mt._lethalEfficiency || false,
    _showMustGoOn: mt._showMustGoOn || false,
    _backstabber: mt._backstabber || false,
    _intimidatingPresence: mt._intimidatingPresence || false,
    isBoss: mt.isBoss || false,
  };

  // Initialize boss ability CDs
  if (mt._specials && mt._specials.length > 1) {
    mob._abilityIndex = 0;
    for (const s of mt._specials) {
      mob._abilityCDs[s] = Math.floor(120 + Math.random() * 120); // stagger initial CDs
    }
  }

  // Phase tagging
  mob.phase = opts.phase || 1;

  // /freeze — auto-freeze newly spawned mobs when global freeze is active
  if (window._mobsFrozen) {
    mob._savedSpeed = mob.speed;
    mob.speed = 0;
    mob._specialTimer = 99999;
    mob._frozen = true;
    mob._testDummy = true;
  }

  return mob;
}

function pickFromWeighted(entries) {
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e.type;
  }
  return entries[entries.length - 1].type;
}

let waveTheme = ""; // current wave theme name

// Spawn positions — edges of the map
function getSpawnPos() {
  // Try edge spawns up to 20 times to find a clear position
  const margin = 4;
  for (let attempt = 0; attempt < 20; attempt++) {
    const edge = Math.floor(Math.random() * 4);
    let tx, ty;
    if (edge === 0) { tx = margin + Math.floor(Math.random() * (level.widthTiles - margin * 2)); ty = margin; }
    else if (edge === 1) { tx = margin + Math.floor(Math.random() * (level.widthTiles - margin * 2)); ty = level.heightTiles - margin - 1; }
    else if (edge === 2) { tx = margin; ty = margin + Math.floor(Math.random() * (level.heightTiles - margin * 2)); }
    else { tx = level.widthTiles - margin - 1; ty = margin + Math.floor(Math.random() * (level.heightTiles - margin * 2)); }

    if (!isSolid(tx, ty)) {
      return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
    }
  }
  // Fallback: scan for any walkable tile away from player
  for (let ty = margin; ty < level.heightTiles - margin; ty++) {
    for (let tx = margin; tx < level.widthTiles - margin; tx++) {
      if (!isSolid(tx, ty)) {
        const px = tx * TILE + TILE / 2, py = ty * TILE + TILE / 2;
        const ddx = px - player.x, ddy = py - player.y;
        if (ddx * ddx + ddy * ddy > 200 * 200) {
          return { x: px, y: py };
        }
      }
    }
  }
  return { x: 10 * TILE + TILE / 2, y: 10 * TILE + TILE / 2 };
}

let nextMobId = 1; // unique mob IDs for witch-skeleton linking

function spawnWave() {
  wave++;
  waveState = "active";
  const comp = getWaveComposition(wave);
  waveTheme = comp.theme;

  // Reset phase tracking
  currentPhase = 1;
  phaseMobsKilled = 0;
  phaseTriggered = [true, false, false]; // phase 1 spawns immediately

  // Clear leftover medpacks from previous wave
  medpacks.length = 0;

  // Boss waves: legacy golem OR floor-config boss
  const isBossWave = comp.forceGolem || comp.forceBoss || false;
  if (isBossWave) {
    // Activate boss-specific hazards
    if (comp.activateHazard && typeof HazardSystem !== 'undefined') {
      HazardSystem.activateBossHazards(comp.forceBoss || 'golem');
    }
    spawnMedpacks();
    spawnMedpacks();
    spawnPhase(comp, 1, isBossWave);
    phaseTriggered = [true, true, true]; // no more phases
    phaseMaxMobs = mobs.length;
    // Tag all boss mobs as phase 1
    for (const m of mobs) { if (!m.phase) m.phase = 1; }
    Events.emit('wave_started', { wave, floor: dungeonFloor, isBoss: true, mobCount: mobs.length });
    return;
  }

  // Phase 1: spawn normally
  spawnMedpacks();
  spawnPhase(comp, 1, false);
  phaseMaxMobs = mobs.length;
  // Tag phase 1 mobs
  for (const m of mobs) { if (!m.phase) m.phase = 1; }
  Events.emit('wave_started', { wave, floor: dungeonFloor, isBoss: false, mobCount: mobs.length });
}

// Spawn a single phase of mobs for the current wave
function spawnPhase(comp, phase, isBossWave) {

  // Farm waves get more mobs (only applies to legacy composition)
  const isLegacy = !comp.forceBoss && !comp.forceGolem;
  const isFarmWave = isLegacy && (wave % 8 === 1 || wave % 8 === 3); // Grunt Rush & Speed Swarm
  const farmMult = isFarmWave ? 1.6 : 1.0;
  const count = Math.floor(getMobCountForWave(wave) * farmMult);

  // Farm waves have slightly weaker mobs
  const farmHPMult = isFarmWave ? 0.7 : 1.0;
  // Phase scaling: +4% HP for phase 2, +8% HP for phase 3
  const phaseHPMult = phase === 2 ? 1.04 : phase === 3 ? 1.08 : 1.0;
  const phaseSpdMult = phase === 2 ? 1.02 : phase === 3 ? 1.04 : 1.0;
  const hpMult = getWaveHPMultiplier(wave) * farmHPMult * phaseHPMult;
  const spdMult = getWaveSpeedMultiplier(wave) * phaseSpdMult;

  // Filter out mob types not yet unlocked (only applies to legacy mobs)
  const unlocked = (type) => {
    if (type === "archer") return wave >= 2;
    if (type === "runner") return wave >= 3;
    if (type === "tank") return wave >= 5;
    if (type === "healer") return wave >= 5;
    if (type === "mummy") return wave >= 4;
    if (type === "witch") return wave >= 6;
    if (type === "golem") return wave >= 10 && wave % 10 === 0;
    return true; // grunt, skeleton, and all floor-specific mobs always unlocked
  };
  const primary = (comp.primary || []).filter(e => unlocked(e.type));
  const support = (comp.support || []).filter(e => unlocked(e.type));
  // Fallback if nothing unlocked yet
  if (primary.length === 0 && !comp.forceBoss) primary.push({type:"grunt",weight:1});
  if (support.length === 0 && !comp.forceBoss) support.push({type:"grunt",weight:1});

  const typeCounts = {};
  const phaseOpts = { phase };

  // === FLOOR-CONFIG BOSS WAVES (The Don, Velocity, etc.) ===
  if (comp.forceBoss) {
    const bossKey = comp.forceBoss;
    // Boss HP ignores party scaling — always 1 boss at base HP (party scaling only affects mob adds)
    const bossHpMult = getWaveHPMultiplier(wave) * farmHPMult * phaseHPMult; // no party HP scale
    const bossPos = getSpawnPos();
    const boss = createMob(bossKey, bossPos.x, bossPos.y, bossHpMult, spdMult, { bossHPMult: 1.5, phase });
    if (boss) { mobs.push(boss); typeCounts[bossKey] = 1; }

    // Duo boss: spawn second boss alongside (Floor 5 Lehvius+Jackman, Malric+Vale)
    if (comp.duoBoss) {
      const duoPos = getSpawnPos();
      const duoBoss = createMob(comp.duoBoss, duoPos.x, duoPos.y, bossHpMult, spdMult, { bossHPMult: 1.5, phase });
      if (duoBoss) { mobs.push(duoBoss); typeCounts[comp.duoBoss] = 1; }
    }

    // Spawn guaranteed support mobs from bossComp
    if (comp.support) {
      for (const entry of comp.support) {
        const cnt = entry.count || 1;
        for (let si = 0; si < cnt; si++) {
          const pos = getSpawnPos();
          const mob = createMob(entry.type, pos.x, pos.y, hpMult, spdMult, phaseOpts);
          if (mob) { mobs.push(mob); typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1; }
        }
      }
    }
    return; // Boss wave spawning done
  }

  // === LEGACY BOSS WAVES (golem) ===
  if (comp.forceGolem) {
    // Boss HP ignores party scaling — always 1 boss at base HP
    const golemHpMult = getWaveHPMultiplier(wave) * farmHPMult * phaseHPMult;
    const golemPos = getSpawnPos();
    const golem = createMob('golem', golemPos.x, golemPos.y, golemHpMult, spdMult, phaseOpts);
    if (golem) { mobs.push(golem); typeCounts["golem"] = 1; }

    // Guarantee spawns: tank, witch, grunt, runner, archer, healer, mummy
    const guaranteedTypes = ["tank", "witch", "grunt", "runner", "archer", "healer", "mummy"];
    const guaranteedCounts = { tank: 3, witch: 2, grunt: 4, runner: 3, archer: 2, healer: 2, mummy: 2 };
    for (const gType of guaranteedTypes) {
      const gCount = guaranteedCounts[gType] || 1;
      for (let gi = 0; gi < gCount; gi++) {
        const gPos = getSpawnPos();
        const mob = createMob(gType, gPos.x, gPos.y, hpMult, spdMult, phaseOpts);
        if (mob) { mobs.push(mob); typeCounts[gType] = (typeCounts[gType] || 0) + 1; }
      }
    }
    return; // Legacy boss spawning done
  }

  // === NORMAL WAVES (floor-config or legacy) ===
  for (let i = 0; i < count; i++) {
    // Pick from primary or support pool based on primaryPct
    const usePrimary = Math.random() < comp.primaryPct || support.length === 0;
    let typeKey = usePrimary ? pickFromWeighted(primary) : pickFromWeighted(support);

    // Enforce per-type caps
    const cap = MOB_CAPS[typeKey] || 99;
    if ((typeCounts[typeKey] || 0) >= cap) {
      const allTypes = [...primary, ...support];
      const available = allTypes.filter(e => (typeCounts[e.type] || 0) < (MOB_CAPS[e.type] || 99));
      if (available.length > 0) {
        typeKey = pickFromWeighted(available);
      } else {
        continue;
      }
    }
    typeCounts[typeKey] = (typeCounts[typeKey] || 0) + 1;

    const pos = getSpawnPos();
    const mob = createMob(typeKey, pos.x, pos.y, hpMult, spdMult, phaseOpts);
    if (mob) mobs.push(mob);
  }
}

// Check if next phase should trigger (called when a mob dies)
function checkPhaseAdvance(deadMobPhase) {
  if (waveState !== "active") return;
  // Boss waves have no phases
  if (phaseTriggered[0] && phaseTriggered[1] && phaseTriggered[2]) return;

  // Only count kills of mobs from the current phase
  if (deadMobPhase === currentPhase) {
    phaseMobsKilled++;
  }

  const nextPhase = currentPhase + 1;
  if (nextPhase > 3) return;
  if (phaseTriggered[nextPhase - 1]) return;

  // Trigger next phase when 75% of current phase's mobs are killed
  if (phaseMaxMobs > 0 && phaseMobsKilled >= Math.floor(phaseMaxMobs * 0.75)) {
    currentPhase = nextPhase;
    phaseTriggered[nextPhase - 1] = true;
    phaseMobsKilled = 0;

    // Spawn next phase mobs
    const comp = getWaveComposition(wave);
    spawnMedpacks();
    const mobsBefore = mobs.length;
    spawnPhase(comp, nextPhase, false);
    // Tag new mobs with their phase number
    for (let mi = mobsBefore; mi < mobs.length; mi++) {
      mobs[mi].phase = nextPhase;
    }
    phaseMaxMobs = mobs.length - mobsBefore; // only count NEW mobs for next threshold

    // Phase announcement
    const phaseNames = ["", "Phase 1", "Phase 2", "Phase 3"];
    hitEffects.push({ x: player.x, y: player.y - 60, life: 35, maxLife: 35, type: "heal", dmg: phaseNames[nextPhase] + " incoming!" });
  }
}

// Track player velocity for prediction
let playerVelX = 0, playerVelY = 0;
