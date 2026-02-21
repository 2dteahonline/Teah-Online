// ===================== AUTHORITY TICK =====================
// Server-authority wrapper: consumes commands, runs simulation, produces snapshot.
// In singleplayer this runs locally. In multiplayer the server would run this.
//
// Flow per frame:
//   1. Client calls translateIntentsToCommands() → fills CommandQueue
//   2. Client calls authorityTick() which:
//      a) Copies & clears CommandQueue
//      b) Applies commands → sets InputIntent flags
//      c) Calls update() (the existing simulation)
//      d) Returns a snapshot (or null if paused)
//
// DEBUG_pauseAuthority = true → authorityTick does nothing (game freezes)

window.DEBUG_pauseAuthority = false;

// Flag: when true, update() skips the keysDown → InputIntent.moveX/moveY block
// because authorityTick already set intents from commands.
window._authorityDriven = false;

window.authorityTick = function() {
  // ---- Pause check ----
  if (DEBUG_pauseAuthority) {
    CommandQueue.length = 0; // discard commands while paused
    return null;
  }

  // ---- 1. Copy & clear command queue ----
  const cmds = CommandQueue.slice();
  CommandQueue.length = 0;

  // ---- 2. Apply commands → InputIntent ----
  // Process in deterministic order: move first, then shoot, then one-frame actions.
  // Since commands are already ordered by enqueue time, we just process sequentially.
  // Reset continuous flags before applying (shoot held resets each tick).
  InputIntent.shootHeld = false;

  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i];
    switch (cmd.t) {
      case 'move':
        InputIntent.moveX = cmd.data.x;
        InputIntent.moveY = cmd.data.y;
        break;

      case 'shoot':
        InputIntent.shootHeld = cmd.data.held;
        // Update aim data so getAimDir() works correctly
        if (cmd.data.aim) {
          InputIntent.mouseX = cmd.data.aim.mouseX;
          InputIntent.mouseY = cmd.data.aim.mouseY;
          InputIntent.arrowAimDir = cmd.data.aim.arrowAimDir;
          InputIntent.arrowShooting = cmd.data.aim.arrowShooting;
        }
        break;

      case 'reload':
        InputIntent.reloadPressed = true;
        break;

      case 'melee':
        InputIntent.meleePressed = true;
        break;

      case 'dash':
        InputIntent.dashPressed = true;
        break;

      case 'interact':
        InputIntent.interactPressed = true;
        break;

      case 'ultimate':
        InputIntent.ultimatePressed = true;
        break;

      case 'skipWave':
        InputIntent.skipWavePressed = true;
        break;

      case 'readyWave':
        InputIntent.readyWavePressed = true;
        break;

      case 'slot':
        if (cmd.data.slot === 0) InputIntent.slot1Pressed = true;
        else if (cmd.data.slot === 1) InputIntent.slot2Pressed = true;
        else if (cmd.data.slot === 2) InputIntent.slot3Pressed = true;
        break;

      case 'usePotion':
        InputIntent.potionPressed = true;
        break;

      case 'grab':
        InputIntent.slot5Pressed = true;
        break;

      case 'useExtra':
        InputIntent.slot4Pressed = true;
        break;

    }
  }

  // ---- 3. Run simulation ----
  // Tell update() to skip keysDown → InputIntent translation (we already did it).
  _authorityDriven = true;
  update();
  _authorityDriven = false;

  // Note: clearOneFrameIntents() is already called at the end of update().

  // ---- 4. Produce snapshot ----
  return serializeGameState();
};
