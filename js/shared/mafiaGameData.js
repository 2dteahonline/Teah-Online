// ===================== MAFIA GAME DATA =====================
// Shared constants for the Mafia game mode (Among Us-style gameplay).
// Loaded in Phase A (shared data), no dependencies.
// Maps provide room layouts; this file provides mode-level config.

const MAFIA_GAME = {
  // ---- Match config ----
  BOT_COUNT: 8,              // 8 bots + 1 player = 9 participants
  IMPOSTOR_COUNT: 1,         // 1 impostor per match (hardcoded for now)
  BOT_SPEED: 6.25,           // matches PLAYER_BASE_SPEED

  // ---- Vision ----
  FOV_BASE_RADIUS: 4.5,        // tiles — vision circle radius

  // ---- Kill mechanics ----
  KILL_RANGE: 120,             // px — distance to target for kill
  KILL_COOLDOWN: 1800,         // 30s between kills (frames @ 60fps)
  DISCUSSION_TIME: 900,      // 15s discussion before voting
  VOTING_TIME: 1800,         // 30s to vote
  EJECTION_TIME: 300,        // 5s ejection animation
  VOTE_RESULTS_TIME: 900,    // 15s to show voting results before ejection
  REPORT_RANGE: 150,         // px — distance to body to report
  EMERGENCY_RANGE: 120,      // px — distance to cafeteria table button
  SABOTAGE_COOLDOWN: 1800,   // 30s between sabotages
  REACTOR_TIMER: 1800,       // 30s to fix reactor
  O2_TIMER: 1800,            // 30s to fix O2

  // ---- Bot AI ----
  BOT_TASK_PAUSE_MIN: 180,   // 3s min pause at "task" location
  BOT_TASK_PAUSE_MAX: 300,   // 5s max pause at "task" location
  BOT_PATH_LIMIT: 8000,      // BFS node limit for pathfinding

  // ---- Return destination ----
  RETURN_LEVEL: 'mafia_lobby',
  RETURN_TX: 25,
  RETURN_TY: 20,

  // ---- Among Us color palette (10 colors) ----
  COLORS: [
    { name: 'Red',    body: '#c51111', dark: '#7a0838' },
    { name: 'Blue',   body: '#132ed1', dark: '#09158e' },
    { name: 'Green',  body: '#127f2d', dark: '#0a4d2e' },
    { name: 'Pink',   body: '#ed54ba', dark: '#ab2bad' },
    { name: 'Orange', body: '#ef7d0e', dark: '#b33e15' },
    { name: 'Yellow', body: '#f5f557', dark: '#c38823' },
    { name: 'Black',  body: '#3f474e', dark: '#1e1f26' },
    { name: 'White',  body: '#d6e0f0', dark: '#8394bf' },
    { name: 'Purple', body: '#6b2fbb', dark: '#3b177c' },
    { name: 'Cyan',   body: '#38fedb', dark: '#24a8a6' },
  ],

  // ---- Bot names ----
  BOT_NAMES: [
    'Red', 'Blue', 'Green', 'Pink', 'Orange', 'Yellow', 'Black', 'White', 'Purple', 'Cyan'
  ],

  // ---- Sabotage types ----
  SABOTAGE_TYPES: {
    reactor_meltdown: {
      timer: 1800, label: 'Reactor Meltdown',
      fixPanels: ['reactor_p1', 'reactor_p2'],
      simultaneous: true,   // both panels must be held at once
    },
    o2_depletion: {
      timer: 1800, label: 'O2 Depleted',
      fixPanels: ['o2_o2', 'o2_admin'],
      simultaneous: false,  // each panel fixed independently via keypad code
    },
    lights_out: {
      timer: 0, label: 'Lights Out',     // no timer — stays until fixed
      fixPanels: ['lights_electrical'],
      simultaneous: false,  // single panel, flip switches to fix
    },
  },

  // ---- Sabotage fix panel positions (tile coords, for range checks) ----
  // These match the skeld_sabotage entities in levelData.js
  SABOTAGE_PANELS: {
    reactor_p1: { tx: 6, ty: 25 },   // 2+XO=6 in actual grid
    reactor_p2: { tx: 6, ty: 44 },
    o2_o2:      { tx: 99, ty: 32 },   // 95+XO=99
    o2_admin:       { tx: 92, ty: 38 },   // 88+XO=92
    lights_electrical: { tx: 41, ty: 55 }, // 37+XO=41, bottom of box
  },

  // ---- Lobby settings (editable from pre-game lobby) ----
  // These are the defaults; the lobby UI modifies MAFIA_SETTINGS at runtime
  SETTINGS_DEFAULTS: {
    // Core gameplay
    impostors: 1,
    killCooldown: 30,        // seconds (integer)
    killDistance: 'Medium',   // 'Short' | 'Medium' | 'Long'
    playerSpeed: 1,          // multiplier (integer)
    // Meeting / voting
    discussionTime: 15,      // seconds
    votingTime: 30,
    emergencyMeetings: 1,
    emergencyCooldown: 15,   // seconds
    confirmEjects: true,
    anonymousVotes: false,
    // Tasks
    commonTasks: 1,
    longTasks: 1,
    shortTasks: 2,
    taskBarUpdates: 'Always', // 'Always' | 'Meetings' | 'Never'
    // Vision
    crewVision: 1,             // multiplier (0.25x–5x)
    impostorVision: 1.5,       // multiplier (0.25x–5x)
    // Match setup
    map: 'skeld_01',
    maxPlayers: 10,
  },

  // ---- Per-map data (room centers, spawn points) ----
  // Each map (skeld_01, etc.) registers its own room centers here
  MAPS: {
    skeld_01: {
      SPAWN: { tx: 74, ty: 18 }, // Cafeteria spawn — below the emergency table
      ROOM_CENTERS: {
        cafeteria:    { tx: 74, ty: 17 },
        upper_engine: { tx: 16, ty: 9 },
        reactor:      { tx: 6,  ty: 35 },
        security:     { tx: 34, ty: 35 },
        medbay:       { tx: 49, ty: 25 },
        electrical:   { tx: 50, ty: 52 },
        admin:        { tx: 91, ty: 46 },
        storage:      { tx: 70, ty: 66 },
        shields:      { tx: 112, ty: 62 },
        communications: { tx: 92, ty: 73 },
        lower_engine: { tx: 16, ty: 60 },
        weapons:      { tx: 109, ty: 9 },
        o2:           { tx: 96, ty: 29 },
        navigation:   { tx: 127, ty: 34 },
      },
    },
  },
};

// Runtime settings — cloned from defaults, modified by lobby UI
const MAFIA_SETTINGS = Object.assign({}, MAFIA_GAME.SETTINGS_DEFAULTS);

// Player's chosen color index (0-9), persisted across lobby visits
let mafiaPlayerColorIdx = 0;
