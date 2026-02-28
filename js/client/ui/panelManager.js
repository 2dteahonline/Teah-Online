// ===================== UI PANEL MANAGER =====================
// Client UI: panel open/close state, icon buttons, shop panel
// Extracted from index_2.html \u2014 Phase D

// ===================== UI PANEL MANAGER =====================
// Centralized panel state — only one main panel open at a time.
// UI.open('shop') automatically closes whatever else is open.
// UI.close() closes current panel. UI.toggle('chat') toggles.
// Each panel can register onOpen/onClose callbacks for cleanup.
const UI = {
  _active: null,      // current main panel id (string) or null
  _panels: {},         // registered panel configs
  _subPanels: {},      // sub-panel states (e.g. identity popups)

  register(id, config = {}) {
    // config: { onOpen, onClose, parent }
    this._panels[id] = config;
  },

  open(id) {
    if (this._active === id) return;
    if (this._active) this.close();
    this._active = id;
    const p = this._panels[id];
    if (p && p.onOpen) p.onOpen();
  },

  close(specificId) {
    // If specificId given, only close if that's what's active
    if (specificId && this._active !== specificId) return;
    if (!this._active) return;
    const p = this._panels[this._active];
    if (p && p.onClose) p.onClose();
    this._active = null;
  },

  toggle(id) {
    if (this._active === id) this.close();
    else this.open(id);
  },

  isOpen(id) { return this._active === id; },
  anyOpen() { return this._active !== null; },
  get active() { return this._active; },
};

// Register all panels with their cleanup callbacks
UI.register('chat', {
  onOpen() { chatInputActive = true; InputIntent.chatActive = true; chatInput = ""; },
  onClose() { chatInputActive = false; InputIntent.chatActive = false; },
});
UI.register('profile', {
  onClose() { statusEditActive = false; },
});
UI.register('settings');
UI.register('shop');
UI.register('inventory', {
  onClose() { cardPopup = null; },
});
UI.register('identity', {
  onClose() {
    statusEditActive = false; statsPanelOpen = false; nameEditActive = false;
    factionPopupOpen = false; relationshipPopupOpen = false;
    countryPopupOpen = false; languagePopupOpen = false;
  },
});
UI.register('customize', {
  onClose() { hexInputActive = false; hexInputError = false; SaveLoad.autoSave(); },
});
UI.register('toolbox', {
  onClose() { /* keep activePlaceTool */ },
});
UI.register('fishVendor', {
  onOpen() { fishVendorTab = 0; },
});

let playerStatus = ""; // player's status message
let statusEditActive = false;
let statusEditValue = "";
let toolboxCategory = 0;
let toolboxScroll = 0;
let activePlaceTool = null; // currently selected item for placement {name, color, group, catIdx, itemIdx}
let isDraggingTile = false; // true when mouse is held down painting tiles
let removeModeActive = false; // hold R to remove tiles
const TOOLBOX_CATEGORIES = [
  { name: "Tilesets", icon: "🧱", items: [
    // Ground tiles
    { name: "Grass", color: "#4a8c3f", selected: false, group: "Ground" },
    { name: "Dark Grass", color: "#2d6b25", selected: false, group: "Ground" },
    { name: "Tall Grass", color: "#5ca04a", selected: false, group: "Ground" },
    { name: "Dry Grass", color: "#a8a050", selected: false, group: "Ground" },
    { name: "Dirt", color: "#8a6a3a", selected: false, group: "Ground" },
    { name: "Dark Dirt", color: "#5a4020", selected: false, group: "Ground" },
    { name: "Mud", color: "#6a5030", selected: false, group: "Ground" },
    { name: "Sand", color: "#d4c090", selected: false, group: "Ground" },
    { name: "Wet Sand", color: "#b0a060", selected: false, group: "Ground" },
    { name: "Snow", color: "#e8eef8", selected: false, group: "Ground" },
    { name: "Ice", color: "#a0d0e8", selected: false, group: "Ground" },
    // Stone & Rock
    { name: "Stone", color: "#808080", selected: false, group: "Stone" },
    { name: "Cobblestone", color: "#707068", selected: false, group: "Stone" },
    { name: "Dark Stone", color: "#484848", selected: false, group: "Stone" },
    { name: "Mossy Stone", color: "#607858", selected: false, group: "Stone" },
    { name: "Gravel", color: "#989088", selected: false, group: "Stone" },
    { name: "Slate", color: "#586068", selected: false, group: "Stone" },
    { name: "Marble", color: "#d0ccc8", selected: false, group: "Stone" },
    // Paths & Roads
    { name: "Stone Path", color: "#9a9088", selected: false, group: "Paths" },
    { name: "Brick Path", color: "#a06040", selected: false, group: "Paths" },
    { name: "Pavement", color: "#686868", selected: false, group: "Paths" },
    { name: "Asphalt", color: "#404040", selected: false, group: "Paths" },
    { name: "Sidewalk", color: "#b0a898", selected: false, group: "Paths" },
    { name: "Crosswalk", color: "#e0e0e0", selected: false, group: "Paths" },
    // Wood & Flooring
    { name: "Wood Planks", color: "#a07840", selected: false, group: "Flooring" },
    { name: "Dark Wood", color: "#6a4a28", selected: false, group: "Flooring" },
    { name: "Light Wood", color: "#c8a860", selected: false, group: "Flooring" },
    { name: "Bamboo", color: "#a8b860", selected: false, group: "Flooring" },
    { name: "Tile Floor", color: "#c8c0b0", selected: false, group: "Flooring" },
    { name: "Checkered", color: "#e0e0e0", selected: false, group: "Flooring" },
    { name: "Carpet Red", color: "#8a2020", selected: false, group: "Flooring" },
    { name: "Carpet Blue", color: "#203868", selected: false, group: "Flooring" },
    // Water
    { name: "Water", color: "#3080c0", selected: false, group: "Water" },
    { name: "Deep Water", color: "#1a4a80", selected: false, group: "Water" },
    { name: "Shallow Water", color: "#60b0d8", selected: false, group: "Water" },
    { name: "Swamp", color: "#406830", selected: false, group: "Water" },
    { name: "Lava", color: "#d04010", selected: false, group: "Water" },
    // Walls
    { name: "Brick Wall", color: "#905030", selected: false, group: "Walls" },
    { name: "Stone Wall", color: "#606060", selected: false, group: "Walls" },
    { name: "Wood Wall", color: "#8a6838", selected: false, group: "Walls" },
    { name: "Metal Wall", color: "#708088", selected: false, group: "Walls" },
    { name: "Dungeon Wall", color: "#383040", selected: false, group: "Walls" },
    { name: "Castle Wall", color: "#787078", selected: false, group: "Walls" },
    { name: "Hedge", color: "#2a6020", selected: false, group: "Walls" },
    { name: "Fence Wood", color: "#a08050", selected: false, group: "Walls" },
    { name: "Fence Iron", color: "#505860", selected: false, group: "Walls" },
  ]},
  { name: "Objects", icon: "🪑", items: [
    // Furniture
    { name: "Wooden Chair", color: "#a07840", selected: false, group: "Furniture" },
    { name: "Table", color: "#8a6838", selected: false, group: "Furniture" },
    { name: "Bed", color: "#c04040", selected: false, group: "Furniture" },
    { name: "Bookshelf", color: "#6a4a28", selected: false, group: "Furniture" },
    { name: "Chest", color: "#b08030", selected: false, group: "Furniture" },
    { name: "Barrel", color: "#7a5a30", selected: false, group: "Furniture" },
    { name: "Crate", color: "#9a7a40", selected: false, group: "Furniture" },
    { name: "Wardrobe", color: "#5a3a18", selected: false, group: "Furniture" },
    { name: "Workbench", color: "#8a7040", selected: false, group: "Furniture" },
    // Nature
    { name: "Oak Tree", color: "#2a7a20", selected: false, group: "Nature" },
    { name: "Pine Tree", color: "#1a5a28", selected: false, group: "Nature" },
    { name: "Dead Tree", color: "#5a4a30", selected: false, group: "Nature" },
    { name: "Palm Tree", color: "#40a030", selected: false, group: "Nature" },
    { name: "Bush", color: "#3a8a28", selected: false, group: "Nature" },
    { name: "Flower Red", color: "#d03030", selected: false, group: "Nature" },
    { name: "Flower Blue", color: "#3060d0", selected: false, group: "Nature" },
    { name: "Mushroom", color: "#c04040", selected: false, group: "Nature" },
    { name: "Rock Small", color: "#707070", selected: false, group: "Nature" },
    { name: "Rock Large", color: "#585858", selected: false, group: "Nature" },
    { name: "Stump", color: "#6a5030", selected: false, group: "Nature" },
    // Structures
    { name: "Campfire", color: "#d07020", selected: false, group: "Structures" },
    { name: "Torch", color: "#e0a020", selected: false, group: "Structures" },
    { name: "Street Lamp", color: "#c0c0a0", selected: false, group: "Structures" },
    { name: "Well", color: "#707880", selected: false, group: "Structures" },
    { name: "Sign Post", color: "#a08050", selected: false, group: "Structures" },
    { name: "Mailbox", color: "#4060a0", selected: false, group: "Structures" },
    { name: "Fountain", color: "#5090c0", selected: false, group: "Structures" },
    { name: "Statue", color: "#909090", selected: false, group: "Structures" },
    { name: "Grave", color: "#606060", selected: false, group: "Structures" },
    { name: "Ladder", color: "#8a6a30", selected: false, group: "Structures" },
    // Urban
    { name: "Trash Can", color: "#505050", selected: false, group: "Urban" },
    { name: "Dumpster", color: "#2a6a30", selected: false, group: "Urban" },
    { name: "Fire Hydrant", color: "#c03030", selected: false, group: "Urban" },
    { name: "Stop Sign", color: "#d02020", selected: false, group: "Urban" },
    { name: "Traffic Cone", color: "#e07020", selected: false, group: "Urban" },
    { name: "Bench", color: "#8a7050", selected: false, group: "Urban" },
    { name: "Vending Machine", color: "#3050a0", selected: false, group: "Urban" },
    { name: "Telephone Pole", color: "#6a5a40", selected: false, group: "Urban" },
    // Dungeon
    { name: "Skeleton Bones", color: "#d0c8b0", selected: false, group: "Dungeon" },
    { name: "Cobweb", color: "#c0c0c0", selected: false, group: "Dungeon" },
    { name: "Iron Cage", color: "#505860", selected: false, group: "Dungeon" },
    { name: "Spike Trap", color: "#808080", selected: false, group: "Dungeon" },
    { name: "Altar", color: "#4a2060", selected: false, group: "Dungeon" },
    { name: "Cauldron", color: "#2a2a2a", selected: false, group: "Dungeon" },
    { name: "Crystal", color: "#80c0e0", selected: false, group: "Dungeon" },
    { name: "Rune Circle", color: "#6040a0", selected: false, group: "Dungeon" },
  ]},
  { name: "NPCs", icon: "👤", items: [
    // Friendly
    { name: "Villager", color: "#8a7a60", selected: false, group: "Friendly" },
    { name: "Merchant", color: "#c0a040", selected: false, group: "Friendly" },
    { name: "Blacksmith", color: "#606060", selected: false, group: "Friendly" },
    { name: "Healer NPC", color: "#40a060", selected: false, group: "Friendly" },
    { name: "Guard", color: "#4060a0", selected: false, group: "Friendly" },
    { name: "Farmer", color: "#6a8a40", selected: false, group: "Friendly" },
    { name: "Fisherman", color: "#5080a0", selected: false, group: "Friendly" },
    { name: "Wizard", color: "#6030a0", selected: false, group: "Friendly" },
    { name: "Bard", color: "#a06040", selected: false, group: "Friendly" },
    { name: "Princess", color: "#d070a0", selected: false, group: "Friendly" },
    // Enemies
    { name: "Bandit", color: "#6a3020", selected: false, group: "Enemies" },
    { name: "Dark Knight", color: "#2a2a3a", selected: false, group: "Enemies" },
    { name: "Goblin", color: "#40802a", selected: false, group: "Enemies" },
    { name: "Orc", color: "#4a6a28", selected: false, group: "Enemies" },
    { name: "Vampire", color: "#4a1020", selected: false, group: "Enemies" },
    { name: "Werewolf", color: "#5a4a30", selected: false, group: "Enemies" },
    { name: "Demon", color: "#a01020", selected: false, group: "Enemies" },
    { name: "Ghost", color: "#a0b0c0", selected: false, group: "Enemies" },
    { name: "Dragon", color: "#802020", selected: false, group: "Enemies" },
    { name: "Slime", color: "#40c040", selected: false, group: "Enemies" },
    // Animals
    { name: "Chicken", color: "#e0d0a0", selected: false, group: "Animals" },
    { name: "Cow", color: "#d0c0b0", selected: false, group: "Animals" },
    { name: "Horse", color: "#8a6a40", selected: false, group: "Animals" },
    { name: "Dog", color: "#b09060", selected: false, group: "Animals" },
    { name: "Cat", color: "#d0a060", selected: false, group: "Animals" },
    { name: "Wolf", color: "#606870", selected: false, group: "Animals" },
    { name: "Bear", color: "#5a3a20", selected: false, group: "Animals" },
    { name: "Deer", color: "#a08050", selected: false, group: "Animals" },
  ]},
  { name: "Guns", icon: "🔫", items: [
    // Pistols
    { name: "9mm Pistol", color: "#505050", selected: false, group: "Pistols" },
    { name: "Revolver", color: "#606060", selected: false, group: "Pistols" },
    { name: "Desert Eagle", color: "#c0a040", selected: false, group: "Pistols" },
    { name: "Silenced Pistol", color: "#383838", selected: false, group: "Pistols" },
    { name: "Flare Gun", color: "#d06020", selected: false, group: "Pistols" },
    // Rifles
    { name: "Assault Rifle", color: "#4a4a4a", selected: false, group: "Rifles" },
    { name: "Sniper Rifle", color: "#3a4a3a", selected: false, group: "Rifles" },
    { name: "Hunting Rifle", color: "#6a5030", selected: false, group: "Rifles" },
    { name: "Burst Rifle", color: "#404850", selected: false, group: "Rifles" },
    { name: "DMR", color: "#505848", selected: false, group: "Rifles" },
    // Shotguns
    { name: "Pump Shotgun", color: "#5a4a30", selected: false, group: "Shotguns" },
    { name: "Auto Shotgun", color: "#484040", selected: false, group: "Shotguns" },
    { name: "Sawed-Off", color: "#6a5038", selected: false, group: "Shotguns" },
    { name: "Double Barrel", color: "#7a6040", selected: false, group: "Shotguns" },
    // SMGs
    { name: "Uzi", color: "#3a3a3a", selected: false, group: "SMGs" },
    { name: "MP5", color: "#404040", selected: false, group: "SMGs" },
    { name: "P90", color: "#484848", selected: false, group: "SMGs" },
    { name: "Vector", color: "#383838", selected: false, group: "SMGs" },
    // Special
    { name: "Rocket Launcher", color: "#4a6a40", selected: false, group: "Special" },
    { name: "Minigun", color: "#585858", selected: false, group: "Special" },
    { name: "Crossbow", color: "#6a4a20", selected: false, group: "Special" },
    { name: "Ray Gun", color: "#20d060", selected: false, group: "Special" },
    { name: "Freeze Ray", color: "#40a0d0", selected: false, group: "Special" },
    { name: "Plasma Rifle", color: "#8040d0", selected: false, group: "Special" },
  ]},
  { name: "Melee", icon: "⚔️", items: [
    // Swords
    { name: "Iron Sword", color: "#a0a0a0", selected: false, group: "Swords" },
    { name: "Steel Sword", color: "#b0b8c0", selected: false, group: "Swords" },
    { name: "Katana", color: "#c0c8d0", selected: false, group: "Swords" },
    { name: "Broadsword", color: "#808890", selected: false, group: "Swords" },
    { name: "Rapier", color: "#c8c8c8", selected: false, group: "Swords" },
    { name: "Scimitar", color: "#b0a890", selected: false, group: "Swords" },
    { name: "Fire Sword", color: "#d06020", selected: false, group: "Swords" },
    { name: "Ice Blade", color: "#60b0e0", selected: false, group: "Swords" },
    { name: "Shadow Blade", color: "#3a2050", selected: false, group: "Swords" },
    // Axes & Hammers
    { name: "Ninja Katanas", color: "#2a2a3a", selected: false, group: "Heavy" },
    { name: "War Hammer", color: "#606060", selected: false, group: "Heavy" },
    { name: "Mace", color: "#787878", selected: false, group: "Heavy" },
    { name: "Flail", color: "#585858", selected: false, group: "Heavy" },
    { name: "Halberd", color: "#686868", selected: false, group: "Heavy" },
    // Light
    { name: "Dagger", color: "#b0b0b0", selected: false, group: "Light" },
    { name: "Throwing Knife", color: "#c0c0c0", selected: false, group: "Light" },
    { name: "Spear", color: "#8a7040", selected: false, group: "Light" },
    { name: "Staff", color: "#6a4a20", selected: false, group: "Light" },
    { name: "Whip", color: "#5a3820", selected: false, group: "Light" },
    { name: "Nunchucks", color: "#7a5a30", selected: false, group: "Light" },
    { name: "Bo Staff", color: "#8a6830", selected: false, group: "Light" },
    // Shields
    { name: "Wood Shield", color: "#8a7040", selected: false, group: "Shields" },
    { name: "Iron Shield", color: "#707880", selected: false, group: "Shields" },
    { name: "Tower Shield", color: "#606870", selected: false, group: "Shields" },
    { name: "Magic Shield", color: "#5060c0", selected: false, group: "Shields" },
  ]},
  { name: "Armor", icon: "🛡️", items: [
    // Helmets
    { name: "Leather Cap", color: "#8a6a40", selected: false, group: "Helmets" },
    { name: "Iron Helm", color: "#707880", selected: false, group: "Helmets" },
    { name: "Steel Helm", color: "#909898", selected: false, group: "Helmets" },
    { name: "Knight Helm", color: "#808890", selected: false, group: "Helmets" },
    { name: "Crown", color: "#d0a020", selected: false, group: "Helmets" },
    { name: "Wizard Hat", color: "#4030a0", selected: false, group: "Helmets" },
    { name: "Hood", color: "#3a3a40", selected: false, group: "Helmets" },
    { name: "Bandana", color: "#c03030", selected: false, group: "Helmets" },
    // Chestplates
    { name: "Leather Vest", color: "#8a6a40", selected: false, group: "Chestplates" },
    { name: "Chainmail", color: "#909090", selected: false, group: "Chestplates" },
    { name: "Iron Plate", color: "#707880", selected: false, group: "Chestplates" },
    { name: "Steel Plate", color: "#909898", selected: false, group: "Chestplates" },
    { name: "Gold Plate", color: "#d0a020", selected: false, group: "Chestplates" },
    { name: "Dark Armor", color: "#2a2a3a", selected: false, group: "Chestplates" },
    { name: "Robe", color: "#4040a0", selected: false, group: "Chestplates" },
    { name: "Cloak", color: "#2a4030", selected: false, group: "Chestplates" },
    // Boots
    { name: "Sandals", color: "#a08060", selected: false, group: "Boots" },
    { name: "Leather Boots", color: "#7a5a30", selected: false, group: "Boots" },
    { name: "Iron Boots", color: "#606868", selected: false, group: "Boots" },
    { name: "Speed Boots", color: "#30a050", selected: false, group: "Boots" },
    { name: "Lava Boots", color: "#d04010", selected: false, group: "Boots" },
    { name: "Cloud Boots", color: "#e0e8f0", selected: false, group: "Boots" },
    // Accessories
    { name: "Ring Gold", color: "#d0a020", selected: false, group: "Accessories" },
    { name: "Ring Silver", color: "#b0b0b0", selected: false, group: "Accessories" },
    { name: "Amulet", color: "#8040b0", selected: false, group: "Accessories" },
    { name: "Cape", color: "#c03030", selected: false, group: "Accessories" },
    { name: "Gloves", color: "#6a5a40", selected: false, group: "Accessories" },
    { name: "Belt", color: "#5a4020", selected: false, group: "Accessories" },
  ]},
  { name: "Consumables", icon: "🧪", items: [
    // Potions
    { name: "Health Potion", color: "#d03030", selected: false, group: "Potions" },
    { name: "Mana Potion", color: "#3060d0", selected: false, group: "Potions" },
    { name: "Speed Potion", color: "#30c060", selected: false, group: "Potions" },
    { name: "Strength Potion", color: "#d06020", selected: false, group: "Potions" },
    { name: "Shield Potion", color: "#4080c0", selected: false, group: "Potions" },
    { name: "Invisibility", color: "#c0c8d0", selected: false, group: "Potions" },
    { name: "Poison", color: "#40a030", selected: false, group: "Potions" },
    { name: "Antidote", color: "#e0d040", selected: false, group: "Potions" },
    // Food
    { name: "Apple", color: "#d03030", selected: false, group: "Food" },
    { name: "Bread", color: "#c8a050", selected: false, group: "Food" },
    { name: "Cheese", color: "#e0c040", selected: false, group: "Food" },
    { name: "Meat", color: "#a04030", selected: false, group: "Food" },
    { name: "Fish", color: "#6090b0", selected: false, group: "Food" },
    { name: "Pie", color: "#c08030", selected: false, group: "Food" },
    { name: "Cake", color: "#e0a0b0", selected: false, group: "Food" },
    { name: "Golden Apple", color: "#e0c020", selected: false, group: "Food" },
    // Materials
    { name: "Wood", color: "#8a6838", selected: false, group: "Materials" },
    { name: "Stone Block", color: "#707070", selected: false, group: "Materials" },
    { name: "Iron Ore", color: "#808080", selected: false, group: "Materials" },
    { name: "Gold Ore", color: "#d0a020", selected: false, group: "Materials" },
    { name: "Diamond", color: "#80d0e0", selected: false, group: "Materials" },
    { name: "Emerald", color: "#30a040", selected: false, group: "Materials" },
    { name: "Ruby", color: "#c02030", selected: false, group: "Materials" },
    { name: "Coal", color: "#2a2a2a", selected: false, group: "Materials" },
    // Scrolls & Keys
    { name: "Scroll Fire", color: "#d06020", selected: false, group: "Scrolls" },
    { name: "Scroll Ice", color: "#40a0d0", selected: false, group: "Scrolls" },
    { name: "Scroll Heal", color: "#40c060", selected: false, group: "Scrolls" },
    { name: "Scroll Teleport", color: "#8040d0", selected: false, group: "Scrolls" },
    { name: "Bronze Key", color: "#a08040", selected: false, group: "Scrolls" },
    { name: "Silver Key", color: "#b0b0b0", selected: false, group: "Scrolls" },
    { name: "Gold Key", color: "#d0a020", selected: false, group: "Scrolls" },
    { name: "Skeleton Key", color: "#d0c8b0", selected: false, group: "Scrolls" },
  ]},
];
let chatMessages = [];
let chatInput = "";
let chatInputActive = false;
let nameEditActive = false;
let nameEditValue = "";

// Customization categories and colors
const CUSTOMIZE_CATS = [
  { name: "Hair", key: "hair" },
  { name: "Facial Hair", key: "facialHair" },
  { name: "Skin", key: "skin" },
  { name: "Eyes", key: "eyes" },
  { name: "Shirt", key: "shirt" },
  { name: "Pants", key: "pants" },
  { name: "Shoes", key: "shoes" },
  { name: "Hat", key: "hat" },
  { name: "Glasses", key: "glasses" },
  { name: "Gloves", key: "gloves" },
  { name: "Belt", key: "belt" },
  { name: "Cape", key: "cape" },
  { name: "Tattoo", key: "tattoo" },
  { name: "Scars", key: "scars" },
  { name: "Earring", key: "earring" },
  { name: "Necklace", key: "necklace" },
  { name: "Backpack", key: "backpack" },
  { name: "Warpaint", key: "warpaint" },
];
let customizeCat = 0;
let customizeSideScroll = 0; // sidebar scroll offset
// Helper to darken/lighten a hex color
function shadeColor(hex, amt) {
  let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  r = Math.max(0, Math.min(255, r + amt)); g = Math.max(0, Math.min(255, g + amt)); b = Math.max(0, Math.min(255, b + amt));
  return "#" + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
let customizeBackup = null; // stores colors before editing so Cancel can restore
let hexInputActive = false;
let hexInputValue = "";
let hexInputError = false;
const COLOR_PALETTE = [
  "#0c0c10","#1a1a2e","#2a1a0a","#3a2a1a","#5a3a20","#7a5a30",
  "#8a7060","#a08060","#c8a060","#d4bba8","#e8d0c0","#f5e6d8",
  "#fff8f0","#ffffff","#c0c0c0","#808080","#404040","#1a1a1a",
  "#e03030","#ff6040","#ff9020","#ffcc00","#ffff40","#a0ff40",
  "#40cc40","#208820","#0a440a","#40cccc","#2090e0","#3060cc",
  "#4040cc","#8040cc","#cc40cc","#ff40a0","#ff8090","#884444",
  "#445566","#556644","#664444","#4a2a2a","#2a3a4a","#3a3a2a",
];

window.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();

  // Chat toggle
  if (key === keybinds.chat) {
    if (keybinds.chat === "tab") e.preventDefault();
    UI.toggle('chat');
    nameEditActive = false;
    keysDown[keybinds.moveUp] = false; keysDown[keybinds.moveDown] = false; keysDown[keybinds.moveLeft] = false; keysDown[keybinds.moveRight] = false;
    return;
  }

  // Profile toggle — only when not typing
  if (key === keybinds.profile && !chatInputActive && !nameEditActive && !statusEditActive) {
    e.preventDefault();
    UI.toggle('profile');
    nameEditActive = false;
    return;
  }

  // Escape closes any panel
  if (e.key === "Escape") {
    // Cancel active fishing
    if (typeof fishingState !== 'undefined' && fishingState.active) {
      cancelFishing();
      return;
    }
    // Chat: Escape closes without sending, clears input
    if (chatInputActive) { chatInput = ""; UI.close(); return; }
    if (nameEditActive) { nameEditActive = false; return; }
    if (statusEditActive) { statusEditActive = false; return; }
    // Customize → back to identity
    if (UI.isOpen('customize')) { UI.close(); UI.open('identity'); return; }
    // Identity sub-panels close first
    if (UI.isOpen('identity') && statsPanelOpen) { statsPanelOpen = false; return; }
    if (UI.isOpen('identity') && (factionPopupOpen || relationshipPopupOpen || countryPopupOpen || languagePopupOpen)) {
      factionPopupOpen = false; relationshipPopupOpen = false; countryPopupOpen = false; languagePopupOpen = false; return;
    }
    // Close any open panel (onClose callbacks handle cleanup)
    if (UI.anyOpen()) { UI.close(); return; }
  }

  // Chat input handling — captures all keys when typing
  if (chatInputActive) {
    e.preventDefault();
    if (e.key === "Enter") {
      // Send message if non-empty
      if (chatInput.trim()) {
        const cmd = chatInput.trim();
        // Chat commands
        const cmdLower = cmd.toLowerCase();
        if (cmdLower.startsWith("/addgold") || cmdLower.startsWith("/gold")) {
          const parts = cmd.split(/\s+/);
          const amt = parseInt(parts[1]);
          if (!isNaN(amt)) { gold += amt; chatMessages.push({ name: "SYSTEM", text: "Added " + amt + " gold. Total: " + gold, time: Date.now() }); }
          else { gold += 500; chatMessages.push({ name: "SYSTEM", text: "Added 500 gold. Total: " + gold, time: Date.now() }); }
        } else if (cmdLower.startsWith("/wave")) {
          const parts = cmd.split(/\s+/);
          const w = parseInt(parts[1]);
          if (!isNaN(w) && w > 0) {
            const newFloor = Math.min(getDungeonMaxFloors(), Math.ceil(w / WAVES_PER_FLOOR));
            const localWave = w - (newFloor - 1) * WAVES_PER_FLOOR;
            dungeonFloor = newFloor;
            wave = localWave - 1;
            stairsOpen = false; stairsAppearTimer = 0;
            recalcMaxHp(); player.hp = player.maxHp;
            resetPhaseState();
            mobs = []; spawnWave();
            chatMessages.push({ name: "SYSTEM", text: "Wave " + w + " (Floor " + newFloor + ", wave " + wave + ")", time: Date.now() });
          }
        } else if (cmdLower === "/heal") {
          player.hp = player.maxHp; chatMessages.push({ name: "SYSTEM", text: "Healed to full", time: Date.now() });
        } else if (cmdLower === "/dung" || cmdLower === "/dungeon") {
          enterLevel('warehouse_01', 20, 20);
          chatMessages.push({ name: "SYSTEM", text: "Teleported to dungeon", time: Date.now() });
        } else if (cmdLower === "/stairs") {
          stairsOpen = true;
          stairsAppearTimer = 0;
          chatMessages.push({ name: "SYSTEM", text: "Staircase opened!", time: Date.now() });
        } else if (cmdLower.startsWith("/floor")) {
          const fl = parseInt(cmdLower.split(" ")[1]);
          if (fl > 0) { dungeonFloor = fl; resetCombatState('floor'); }
          chatMessages.push({ name: "SYSTEM", text: "Set to floor " + dungeonFloor, time: Date.now() });
        } else if (cmdLower === "/help") {
          chatMessages.push({ name: "SYSTEM", text: "/testmob (GUI) | /test <type> [live] | /spawn <type> | /killall | /gold [amt] | /wave [n] | /heal | /dung | /op | /stairs | /floor [n] | /sprites | /export [name] | /save | /resetsave | /mg", time: Date.now() });
        } else if (cmdLower === "/save") {
          SaveLoad.save();
          chatMessages.push({ name: "SYSTEM", text: "Game saved!", time: Date.now() });
        } else if (cmdLower === "/resetsave") {
          SaveLoad.clear();
          chatMessages.push({ name: "SYSTEM", text: "Save data cleared. Refresh to reset to defaults.", time: Date.now() });
        } else if (cmdLower === "/op") {
          window._opMode = !window._opMode;
          if (window._opMode) {
            gold = 999999;
            player.maxHp = 10000;
            player.hp = 10000;
            chatMessages.push({ name: "SYSTEM", text: "OP MODE ON — infinite gold, all items unlocked, 10000 HP", time: Date.now() });
          } else {
            chatMessages.push({ name: "SYSTEM", text: "OP MODE OFF", time: Date.now() });
          }
        } else if (cmdLower === "/mg") {
          chatInput = "";
          UI.close();
          setTimeout(() => UI.open('modifygun'), 0);
          return;
        } else if (cmdLower.startsWith("/spawn")) {
          const parts = cmd.trim().split(/\s+/);
          const typeKey = parts[1];
          if (!typeKey) {
            const allTypes = Object.keys(MOB_TYPES).join(', ');
            chatMessages.push({ name: "SYSTEM", text: "Usage: /spawn <type>  Types: " + allTypes, time: Date.now() });
          } else if (!MOB_TYPES[typeKey]) {
            chatMessages.push({ name: "SYSTEM", text: "Unknown mob type: " + typeKey, time: Date.now() });
          } else {
            const mob = createMob(typeKey, player.x + 80, player.y, 1, 1);
            if (mob) {
              mobs.push(mob);
              chatMessages.push({ name: "SYSTEM", text: "Spawned " + mob.name + " (" + typeKey + ")", time: Date.now() });
            }
          }
        } else if (cmdLower === "/killall") {
          const count = mobs.length;
          mobs.length = 0;
          bullets.length = 0;
          chatMessages.push({ name: "SYSTEM", text: "Killed " + count + " mobs, cleared bullets", time: Date.now() });
        } else if (cmdLower === "/grunt") {
          // Legacy: spawn grunt via createMob
          const mob = createMob('grunt', player.x + 80, player.y, 1, 1);
          if (mob) mobs.push(mob);
          chatMessages.push({ name: "SYSTEM", text: "Spawned test grunt", time: Date.now() });
        } else if (cmdLower === "/testmob" || cmdLower === "/testmobs") {
          chatInput = "";
          chatInputActive = false; InputIntent.chatActive = false;
          UI.close();
          UI.open('testmob');
          return;
        } else if (cmdLower.startsWith("/test")) {
          const parts = cmd.trim().split(/\s+/);
          const typeKey = parts[1];
          const mode = parts[2]; // 'live' = unfrozen
          if (!typeKey) {
            // Enter test arena if not already there, show help
            if (!Scene.inTestArena) {
              enterLevel('test_arena', 10, 4);
              dungeonFloor = 1;
              window._opMode = true;
              player.hp = player.maxHp = 10000;
              gold = 999999;
            }
            const allTypes = Object.keys(MOB_TYPES).join(', ');
            chatMessages.push({ name: "SYSTEM", text: "TEST ARENA — /test <type> [live]  Types: " + allTypes, time: Date.now() });
          } else if (!MOB_TYPES[typeKey]) {
            chatMessages.push({ name: "SYSTEM", text: "Unknown mob: " + typeKey + ". Types: " + Object.keys(MOB_TYPES).join(', '), time: Date.now() });
          } else {
            // Enter test arena if needed
            if (!Scene.inTestArena) {
              enterLevel('test_arena', 10, 4);
              dungeonFloor = 1;
              window._opMode = true;
              player.hp = player.maxHp = 10000;
              gold = 999999;
            }
            // Clear previous test mob
            mobs.length = 0; bullets.length = 0; hitEffects.length = 0;
            if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.clear();
            if (typeof HazardSystem !== 'undefined') HazardSystem.clear();
            player.hp = player.maxHp;
            // Spawn single mob to the right of player
            const mob = createMob(typeKey, player.x + 150, player.y, 1, 1);
            if (mob) {
              if (mode !== 'live') { mob.speed = 0; mob._specialTimer = 99999; }
              mobs.push(mob);
              chatMessages.push({ name: "SYSTEM", text: "Testing: " + mob.name + " (" + typeKey + ")" + (mode === 'live' ? " [LIVE]" : " [FROZEN] — /test " + typeKey + " live for AI"), time: Date.now() });
            }
          }
        } else if (cmdLower === "/sprites") {
          useSpriteMode = !useSpriteMode;
          chatMessages.push({ name: "SYSTEM", text: "Sprite mode: " + (useSpriteMode ? "ON" : "OFF"), time: Date.now() });
        } else if (cmdLower.startsWith("/export")) {
          const parts = cmd.split(/\s+/);
          const name = parts[1] || 'player_body';
          exportSpriteTemplate(name);
          chatMessages.push({ name: "SYSTEM", text: "Exported " + name + " template. Layers: [name]_body, [name]_head, [name]_hat", time: Date.now() });
        } else {
          chatMessages.push({ name: player.name, text: cmd, time: Date.now() });
        }
        if (chatMessages.length > 50) chatMessages.shift();
      }
      // Always close chat on Enter (whether message sent or not)
      chatInput = "";
      UI.close();
      return;
    }
    if (e.key === "Backspace") {
      chatInput = chatInput.slice(0, -1);
    } else if (e.key.length === 1) {
      if (chatInput.length < 80) chatInput += e.key;
    }
    return;
  }

  // Hex input handling
  if (hexInputActive) {
    e.preventDefault();
    if (e.key === "Enter") {
      if (/^#[0-9a-fA-F]{6}$/.test(hexInputValue)) {
        player[CUSTOMIZE_CATS[customizeCat].key] = hexInputValue.toLowerCase();
        hexInputActive = false;
        hexInputError = false;
      } else {
        hexInputError = true;
      }
    } else if (e.key === "Escape") {
      hexInputActive = false;
      hexInputError = false;
    } else if (e.key === "Backspace") {
      hexInputValue = hexInputValue.slice(0, -1);
      hexInputError = false;
    } else if (e.key.length === 1 && hexInputValue.length < 7) {
      const ch = e.key;
      if (ch === "#" && hexInputValue.length === 0) {
        hexInputValue = "#";
      } else if (/[0-9a-fA-F]/.test(ch)) {
        if (hexInputValue.length === 0) hexInputValue = "#";
        hexInputValue += ch.toUpperCase();
      }
      hexInputError = false;
    }
    return;
  }

  // Name edit handling — captures all keys when typing name
  if (nameEditActive) {
    e.preventDefault();
    if (e.key === "Enter") {
      if (nameEditValue.trim()) player.name = nameEditValue.trim();
      nameEditActive = false;
      SaveLoad.autoSave();
    } else if (e.key === "Backspace") {
      nameEditValue = nameEditValue.slice(0, -1);
    } else if (e.key.length === 1 && nameEditValue.length < 16) {
      nameEditValue += e.key;
    }
    return;
  }
  if (statusEditActive) {
    e.preventDefault();
    if (e.key === "Enter") {
      playerStatus = statusEditValue.trim();
      statusEditActive = false;
      SaveLoad.autoSave();
    } else if (e.key === "Escape") {
      statusEditActive = false;
    } else if (e.key === "Backspace") {
      statusEditValue = statusEditValue.slice(0, -1);
    } else if (e.key.length === 1 && statusEditValue.length < 60) {
      statusEditValue += e.key;
    }
    return;
  }

  // Fishing reel input (Space key during active fishing)
  if (key === " " && typeof fishingState !== 'undefined' && fishingState.active) {
    e.preventDefault();
    InputIntent.reelPressed = true;
    InputIntent.reelHeld = true;
    return;
  }

  // Normal game input — always works when not typing
  keysDown[key] = true;
  const allBound = Object.values(keybinds);
  if (allBound.includes(key) || key === " ") e.preventDefault();

  // R key toggles remove mode when placement tool is active
  if (key === "r" && activePlaceTool && !isTyping && !UI.isOpen('toolbox')) {
    removeModeActive = !removeModeActive;
  }

  // ESC deselects active placement tool
  if (key === "escape" && activePlaceTool && !UI.anyOpen()) {
    activePlaceTool = null;
    removeModeActive = false;
    return;
  }

  // Keybind rebinding mode — capture next key press
  if (rebindingKey) {
    // Don't allow escape or enter as keybinds
    if (key !== "escape" && key !== "enter") {
      if (key === "tab") e.preventDefault(); // prevent browser tab-switching
      // Check if key is already bound to something else — swap
      for (const action in keybinds) {
        if (keybinds[action] === key && action !== rebindingKey) {
          keybinds[action] = keybinds[rebindingKey]; // swap
          break;
        }
      }
      keybinds[rebindingKey] = key;
    }
    rebindingKey = null;
    SaveLoad.autoSave();
    e.preventDefault();
    return;
  }

  // Arrow key shooting (using keybinds)
  if (key === keybinds.shootUp || key === keybinds.shootDown || key === keybinds.shootLeft || key === keybinds.shootRight) {
    arrowAimDir = key === keybinds.shootDown ? 0 : key === keybinds.shootUp ? 1 : key === keybinds.shootLeft ? 2 : 3;
    arrowShooting = true;
    // Intent: arrow-key aim
    InputIntent.arrowAimDir = arrowAimDir;
    InputIntent.arrowShooting = true;
    InputIntent.shootHeld = true;
    InputIntent.shootPressed = true;
  }

  // ---- Intent-only flags (Step 3: authority applies these in update()) ----
  if (key === "r" && !gun.reloading && gun.ammo < gun.magSize) {
    InputIntent.reloadPressed = true;
  }
  if (key === "f") {
    InputIntent.meleePressed = true;
    InputIntent.ultimatePressed = true;
  }
  if (key === "shift" && !chatInputActive && !nameEditActive && !statusEditActive) {
    InputIntent.dashPressed = true;
  }
  if (key === keybinds.interact && !chatInputActive && !nameEditActive && !statusEditActive) {
    InputIntent.interactPressed = true;
  }
  if (key === keybinds.identity && !chatInputActive && !nameEditActive && !statusEditActive) {
    if (nearQueue) { joinQueue(); }
    else { UI.toggle('identity'); }
  }
  if (key === "n" && !chatInputActive && !nameEditActive && !statusEditActive && window._opMode) {
    InputIntent.skipWavePressed = true;
  }
  if (key === "g" && !chatInputActive && !nameEditActive && !statusEditActive && Scene.inDungeon) {
    InputIntent.readyWavePressed = true;
  }
  // Hotbar keys — set intent flags only (authority applies in update)
  if (key === keybinds.slot1 || key === keybinds.slot2 || key === keybinds.slot3) {
    const slot = key === keybinds.slot1 ? 0 : key === keybinds.slot2 ? 1 : 2;
    if (slot === 0) InputIntent.slot1Pressed = true;
    else if (slot === 1) InputIntent.slot2Pressed = true;
    else InputIntent.slot3Pressed = true;
    if (hotbarSlots[slot].type === "potion") InputIntent.potionPressed = true;
  }
  if (key === keybinds.slot5) {
    InputIntent.slot5Pressed = true;
  }
  if (key === keybinds.slot4) {
    InputIntent.slot4Pressed = true;
  }
  // Farming seed selection — number keys 1-9 when in farm
  if (!chatInputActive && !nameEditActive && !statusEditActive) {
    const numMatch = key.match(/^[1-9]$/);
    if (numMatch && typeof handleFarmSeedSelect === 'function') {
      handleFarmSeedSelect(parseInt(key));
    }
  }
});
window.addEventListener("keyup", e => {
  const key = e.key.toLowerCase();
  keysDown[key] = false;
  // Fishing reel release
  if (key === " " && typeof fishingState !== 'undefined') {
    InputIntent.reelHeld = false;
  }
  if (key === keybinds.shootUp || key === keybinds.shootDown || key === keybinds.shootLeft || key === keybinds.shootRight) {
    arrowShooting = false;
    // Clear arrow shooting intent if no arrow keys held
    const anyArrow = keysDown[keybinds.shootUp] || keysDown[keybinds.shootDown] ||
                     keysDown[keybinds.shootLeft] || keysDown[keybinds.shootRight];
    if (!anyArrow) {
      InputIntent.arrowShooting = false;
      InputIntent.shootHeld = InputIntent.mouseDown; // still held if mouse is down
    }
  }
});

let arrowAimDir = 0;
let arrowShooting = false;

