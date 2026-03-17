// ===================== HIDE & SEEK DATA =====================
// Shared constants for the Hide & Seek game mode.
// Loaded in Phase A (shared data), no dependencies.

const HIDESEEK = {
  HIDE_TIME:       1800,   // 30s @ 60fps — hider moves, seeker frozen
  SEEK_TIME:       1800,   // 30s @ 60fps — seeker moves, hider frozen
  POST_MATCH_TIME: 600,    // 10s @ 60fps — results screen before auto-return
  TAG_RANGE:       90,     // px — matches default melee.range
  FOV_RADIUS:      4.5,    // tiles — seeker's visible circle during seek phase (50% larger)
  MAP_ID:          'hide_01',
  BOT_SPEED:       4.69,   // matches PLAYER_BASE_SPEED (75% of 6.25)
  BOT_DETECT_RANGE: 3,     // tiles — seeker bot detects hider within this range
  RETURN_LEVEL: 'lobby_01', // level to return to after match
  RETURN_TX: 17,            // spawn tile X in return level (centered on entrance)
  RETURN_TY: 22,            // spawn tile Y in return level (below portal zone)
};
