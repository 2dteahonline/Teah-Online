// ===================== INPUT INTENT =====================
// Client writes intents here each frame; authority reads & applies them.
// This decouples "what the player wants to do" from "what actually happens."
//
// Held flags persist as long as the key/button is held.
// Pressed flags are true for ONE frame only (cleared by clearOneFrameIntents).
//
// Usage:
//   InputIntent.shootHeld    ← true while mouse/arrow held
//   InputIntent.meleePressed ← true for one frame when F pressed
//   InputIntent.moveX        ← -1, 0, or 1

window.InputIntent = {
  // ---- Chat state (held) ----
  chatActive: false,   // true while chat input is focused (blocks gameplay intents)

  // ---- Movement (held) ----
  moveX: 0,           // -1 = left, 0 = none, 1 = right
  moveY: 0,           // -1 = up, 0 = none, 1 = down

  // ---- Mouse (continuous) ----
  mouseX: 0,          // screen-space mouse X
  mouseY: 0,          // screen-space mouse Y
  mouseDown: false,    // left mouse button held

  // ---- Shooting (held + pressed) ----
  shootHeld: false,    // mouse or arrow keys held (continuous fire)
  shootPressed: false, // single frame: just started shooting (ONE-FRAME)
  arrowAimDir: 0,     // 0=down,1=up,2=left,3=right (arrow-key aim)
  arrowShooting: false,// arrow keys are actively aiming

  // ---- Melee (pressed) ----
  meleePressed: false, // F key pressed (ONE-FRAME)

  // ---- Reload (pressed) ----
  reloadPressed: false,// R key pressed (ONE-FRAME)

  // ---- Dash (pressed) ----
  dashPressed: false,  // Shift pressed to activate ninja dash (ONE-FRAME)

  // ---- Interact (pressed) ----
  interactPressed: false, // E key pressed (ONE-FRAME)

  // ---- Hotbar (pressed) ----
  slot1Pressed: false, // keybind slot 1 (ONE-FRAME)
  slot2Pressed: false, // keybind slot 2 (ONE-FRAME)
  slot3Pressed: false, // keybind slot 3 (ONE-FRAME)
  slot4Pressed: false, // extra item slot (ONE-FRAME)
  slot5Pressed: false, // grab slot (ONE-FRAME)

  // ---- Potion (pressed) ----
  potionPressed: false,// potion use (ONE-FRAME)

  // ---- Ultimate (pressed) ----
  ultimatePressed: false, // F key for shrine/godspeed (ONE-FRAME)

  // ---- Wave skip (pressed) ----
  skipWavePressed: false, // N key OP mode (ONE-FRAME)
  readyWavePressed: false,// G key skip countdown (ONE-FRAME)

  // ---- Fishing (pressed + held) ----
  fishCastPressed: false, // one-frame: E key near fishing spot (ONE-FRAME)
  reelPressed: false,     // one-frame: Space pressed during bite/reel (ONE-FRAME)
  reelHeld: false,        // held: Space held during reel phase
};

// ===================== CLEAR ONE-FRAME INTENTS =====================
// Call once per frame AFTER authority has consumed intents.
// Only clears "pressed" flags (one-frame events).
// Does NOT clear held/continuous flags (moveX, moveY, mouseDown, shootHeld, etc.).
function clearOneFrameIntents() {
  InputIntent.shootPressed = false;
  InputIntent.meleePressed = false;
  InputIntent.reloadPressed = false;
  InputIntent.dashPressed = false;
  InputIntent.interactPressed = false;
  InputIntent.slot1Pressed = false;
  InputIntent.slot2Pressed = false;
  InputIntent.slot3Pressed = false;
  InputIntent.slot4Pressed = false;
  InputIntent.slot5Pressed = false;
  InputIntent.potionPressed = false;
  InputIntent.ultimatePressed = false;
  InputIntent.skipWavePressed = false;
  InputIntent.readyWavePressed = false;
  InputIntent.fishCastPressed = false;
  InputIntent.reelPressed = false;
}
