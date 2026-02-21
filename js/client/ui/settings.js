// ===================== SETTINGS SYSTEM =====================
// Client UI: settings panel
// Extracted from index_2.html — Phase D

// ===================== SETTINGS SYSTEM =====================
const SETTINGS_TABS = ["General", "Keybinds", "Sounds", "Indicators", "Profile", "Message", "Privacy"];
let settingsActiveTab = 0;
let settingsScroll = 0;

// === KEYBIND SYSTEM ===
const DEFAULT_KEYBINDS = {
  moveUp: "w", moveDown: "s", moveLeft: "a", moveRight: "d",
  shootUp: "arrowup", shootDown: "arrowdown", shootLeft: "arrowleft", shootRight: "arrowright",
  slot1: "1", slot2: "2", slot3: "3", slot4: "4", slot5: "5",
  chat: "tab", profile: "h", interact: "e", identity: "z",
};
const keybinds = { ...DEFAULT_KEYBINDS };
let rebindingKey = null; // which keybind action we're currently rebinding

const KEYBIND_ITEMS = [
  { label: "MOVEMENT", type: "header" },
  { label: "Move Up", action: "moveUp" },
  { label: "Move Down", action: "moveDown" },
  { label: "Move Left", action: "moveLeft" },
  { label: "Move Right", action: "moveRight" },
  { label: "SHOOTING", type: "header" },
  { label: "Shoot Up", action: "shootUp" },
  { label: "Shoot Down", action: "shootDown" },
  { label: "Shoot Left", action: "shootLeft" },
  { label: "Shoot Right", action: "shootRight" },
  { label: "HOTBAR", type: "header" },
  { label: "Slot 1 (Gun)", action: "slot1" },
  { label: "Slot 2 (Melee)", action: "slot2" },
  { label: "Slot 3 (Potion)", action: "slot3" },
  { label: "Slot 4 (Item)", action: "slot4" },
  { label: "Slot 5 (Grab)", action: "slot5" },
  { label: "PANELS", type: "header" },
  { label: "Chat", action: "chat" },
  { label: "Profile", action: "profile" },
  { label: "Interact / Inventory", action: "interact" },
  { label: "Identity", action: "identity" },
];

function getKeyDisplayName(key) {
  if (!key) return "---";
  const names = {
    arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→",
    " ": "SPACE", escape: "ESC", tab: "TAB", enter: "ENTER",
    shift: "SHIFT", control: "CTRL", alt: "ALT",
    backspace: "BKSP", delete: "DEL",
  };
  return names[key] || key.toUpperCase();
}

function isKeyBound(key) {
  // Check if a key matches a keybind action
  for (const action in keybinds) {
    if (keybinds[action] === key) return action;
  }
  return null;
}

const gameSettings = {
  // General
  nicknames: true,
  animations: true,
  dayNightWeather: false,
  bloodAnim: true,
  deathAnim: true,
  hotbarPosition: "right", // "right" or "bottom"
  spriteMode: false,
  // Sounds
  masterVolume: true,
  sfx: true,
  music: true,
  ambient: true,
  // Indicators
  damageNumbers: true,
  healthBars: true,
  mobHpText: false,
  killFeed: true,
  waveAnnounce: true,
  playerHpBar: true,
  playerIndicator: true,
  // Profile
  privateStats: false,
  language: "English",
  currency: "USD",
  showOnlineTime: true,
  relationshipStatus: "Single",
  // Message
  chatVisibility: "All",
  pmFriendsOnly: false,
  disableAllMessages: false,
  receiveBotMessages: true,
  // Privacy
  appearOffMap: false,
};

