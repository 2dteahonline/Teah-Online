// ===================== MAFIA GAME DATA =====================
// Shared constants for the Mafia game mode (Among Us-style gameplay).
// Loaded in Phase A (shared data), no dependencies.
// Maps provide room layouts; this file provides mode-level config.

const MAFIA_GAME = {
  // ---- Match config ----
  BOT_COUNT: 8,              // 8 bots + 1 player = 9 participants
  IMPOSTOR_COUNT: 1,         // 1 impostor per match (hardcoded for now)
  BOT_SPEED: 6.25,           // matches PLAYER_BASE_SPEED

  // ---- Timers (frames @ 60fps) ----
  KILL_COOLDOWN: 1800,       // 30s between kills
  DISCUSSION_TIME: 900,      // 15s discussion before voting
  VOTING_TIME: 1800,         // 30s to vote
  EJECTION_TIME: 300,        // 5s ejection animation
  SABOTAGE_COOLDOWN: 1800,   // 30s between sabotages
  REACTOR_TIMER: 1800,       // 30s to fix reactor
  O2_TIMER: 1800,            // 30s to fix O2

  // ---- Bot AI ----
  BOT_TASK_PAUSE_MIN: 180,   // 3s min pause at "task" location
  BOT_TASK_PAUSE_MAX: 300,   // 5s max pause at "task" location
  BOT_PATH_LIMIT: 8000,      // BFS node limit for pathfinding

  // ---- Return destination ----
  RETURN_LEVEL: 'lobby_01',
  RETURN_TX: 20,
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

  // ---- Per-map data (room centers, spawn points) ----
  // Each map (skeld_01, etc.) registers its own room centers here
  MAPS: {
    skeld_01: {
      SPAWN: { tx: 74, ty: 15 }, // Cafeteria spawn (actual grid coords, virtual + XO=4)
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
