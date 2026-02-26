// ===================== COMMAND QUEUE =====================
// Server-authority pattern: client produces commands, authority consumes them.
// Commands are plain JSON objects — network-ready when multiplayer arrives.
//
// Command format:
//   { t: string, ts: number, data: object }
//
// Types:
//   'move'       — { x: -1|0|1, y: -1|0|1 }
//   'shoot'      — { held: bool, aim: { mouseX, mouseY, arrowAimDir, arrowShooting } }
//   'melee'      — {}
//   'reload'     — {}
//   'dash'       — {}
//   'interact'   — {}
//   'usePotion'  — {}
//   'slot'       — { slot: 0|1|2 }
//   'useExtra'   — {}
//   'grab'       — {}
//   'readyWave'  — {}
//   'skipWave'   — {}
//   'ultimate'   — {}

window.CommandQueue = [];

// ---- History ring buffer for DEBUG_dumpCommands ----
const _cmdHistory = [];
const _cmdHistoryMax = 200;

window.enqueueCommand = function(cmd) {
  CommandQueue.push(cmd);
  // Also push to history ring
  _cmdHistory.push(cmd);
  if (_cmdHistory.length > _cmdHistoryMax) _cmdHistory.shift();
};

// ===================== CLIENT: TRANSLATE INTENTS → COMMANDS =====================
// Called once per frame from the client update loop BEFORE authorityTick.
// Reads InputIntent flags and produces commands. Does NOT clear intents —
// clearOneFrameIntents is called by authorityTick after processing.
function translateIntentsToCommands() {
  const I = InputIntent;
  const isTyping = I.chatActive || nameEditActive;
  const panelBlocksMovement = UI.anyOpen() && !UI.isOpen('toolbox');

  // --- Movement (every frame, even if stationary) ---
  if (!isTyping && !panelBlocksMovement) {
    // Compute direction from keysDown → InputIntent (held state)
    let mdx = 0, mdy = 0;
    if (keysDown[keybinds.moveLeft]) mdx -= 1;
    if (keysDown[keybinds.moveRight]) mdx += 1;
    if (keysDown[keybinds.moveUp]) mdy -= 1;
    if (keysDown[keybinds.moveDown]) mdy += 1;
    I.moveX = mdx;
    I.moveY = mdy;
  } else {
    I.moveX = 0;
    I.moveY = 0;
  }

  enqueueCommand({
    t: 'move',
    ts: Date.now(),
    data: { x: I.moveX, y: I.moveY },
  });

  // --- Shooting (continuous held state) ---
  if (!isTyping) {
    enqueueCommand({
      t: 'shoot',
      ts: Date.now(),
      data: {
        held: I.shootHeld,
        aim: {
          mouseX: I.mouseX,
          mouseY: I.mouseY,
          arrowAimDir: I.arrowAimDir,
          arrowShooting: I.arrowShooting,
        },
      },
    });
  }

  // --- One-frame actions (only if flag is set) ---
  if (!isTyping) {
    if (I.reloadPressed)    enqueueCommand({ t: 'reload',    ts: Date.now(), data: {} });
    if (I.meleePressed)     enqueueCommand({ t: 'melee',     ts: Date.now(), data: {} });
    if (I.dashPressed)      enqueueCommand({ t: 'dash',      ts: Date.now(), data: {} });
    if (I.interactPressed)  enqueueCommand({ t: 'interact',  ts: Date.now(), data: {} });
    if (I.ultimatePressed)  enqueueCommand({ t: 'ultimate',  ts: Date.now(), data: {} });
    if (I.skipWavePressed)  enqueueCommand({ t: 'skipWave',  ts: Date.now(), data: {} });
    if (I.readyWavePressed) enqueueCommand({ t: 'readyWave', ts: Date.now(), data: {} });

    // Slot selection (1/2/3 keys)
    if (I.slot1Pressed)     enqueueCommand({ t: 'slot', ts: Date.now(), data: { slot: 0 } });
    if (I.slot2Pressed)     enqueueCommand({ t: 'slot', ts: Date.now(), data: { slot: 1 } });
    if (I.slot3Pressed)     enqueueCommand({ t: 'slot', ts: Date.now(), data: { slot: 2 } });

    // Potion (direct press, only if not already handled by a slot key)
    if (I.potionPressed && !I.slot1Pressed && !I.slot2Pressed && !I.slot3Pressed) {
      enqueueCommand({ t: 'usePotion', ts: Date.now(), data: {} });
    }

    // Grab and extra slot
    if (I.slot5Pressed) enqueueCommand({ t: 'grab',     ts: Date.now(), data: {} });
    if (I.slot4Pressed) enqueueCommand({ t: 'useExtra',  ts: Date.now(), data: {} });
  }
}

// ===================== DEBUG =====================

window.DEBUG_dumpCommands = function(n) {
  n = n || 30;
  const slice = _cmdHistory.slice(-n);
  console.log('[commands] Last ' + slice.length + ' commands:');
  for (const cmd of slice) {
    const age = Date.now() - cmd.ts;
    console.log('  ' + cmd.t + ' (' + age + 'ms ago)', cmd.data);
  }
  return slice;
};
