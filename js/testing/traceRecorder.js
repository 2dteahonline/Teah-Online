// ===================== TRACE RECORDER =====================
// Records gameplay input traces for Unity parity testing.
// Hooks into the game loop to capture InputIntent state each tick.
//
// Usage:
//   TraceRecorder.start()          — begin recording (captures initial state)
//   TraceRecorder.stop()           — stop recording, returns trace object
//   TraceRecorder.save('myTrace')  — downloads trace as JSON file
//   /trace start                   — chat command to start
//   /trace stop                    — chat command to stop and save
//
// Fixture generators (for deterministic tests):
//   TraceRecorder.generateIdleTrace(ticks)
//   TraceRecorder.generateMovementTrace()
//   TraceRecorder.generateBulletTrace()

window.TraceRecorder = {
  isRecording: false,
  _trace: null,
  _tickCount: 0,

  // ---- START ----
  start() {
    if (this.isRecording) {
      console.warn('[TraceRecorder] Already recording. Call stop() first.');
      return;
    }
    this._trace = {
      initialState: serializeGameState(),
      entries: [],
    };
    this._tickCount = 0;
    this.isRecording = true;
    console.log('[TraceRecorder] Recording started.');
  },

  // ---- RECORD TICK ----
  // Call once per physics tick, after translateIntentsToCommands but before authorityTick.
  recordTick() {
    if (!this.isRecording || !this._trace) return;

    const I = InputIntent;

    // Determine quickslot press (1-5, or 0 if none)
    let quickslot = 0;
    if (I.slot1Pressed) quickslot = 1;
    else if (I.slot2Pressed) quickslot = 2;
    else if (I.slot3Pressed) quickslot = 3;
    else if (I.slot4Pressed) quickslot = 4;
    else if (I.slot5Pressed) quickslot = 5;

    this._trace.entries.push({
      tick: this._tickCount,
      moveX: I.moveX,
      moveY: I.moveY,
      shootHeld: I.shootHeld,
      // Screen-space mouse (what the command wire sends)
      mouseX: I.mouseX,
      mouseY: I.mouseY,
      // World-space mouse (what getAimDir() actually reads)
      mouseWorldX: I.mouseWorldX || 0,
      mouseWorldY: I.mouseWorldY || 0,
      // Arrow-key aim (getAimDir() checks these first, bypasses mouse entirely)
      arrowAimDir: I.arrowAimDir || 0,
      arrowShooting: !!I.arrowShooting,
      meleePressed: I.meleePressed,
      dashPressed: I.dashPressed,
      reloadPressed: I.reloadPressed,
      interactPressed: I.interactPressed,
      usePotionPressed: I.potionPressed,
      quickslot: quickslot,
    });

    this._tickCount++;
  },

  // ---- STOP ----
  stop() {
    if (!this.isRecording) {
      console.warn('[TraceRecorder] Not recording.');
      return null;
    }
    this.isRecording = false;
    const trace = this._trace;
    console.log('[TraceRecorder] Recording stopped. ' + trace.entries.length + ' ticks captured.');
    return trace;
  },

  // ---- SAVE ----
  // Downloads the current (or last) trace as a JSON file.
  save(filename) {
    const trace = this._trace;
    if (!trace) {
      console.warn('[TraceRecorder] No trace to save. Record first.');
      return;
    }
    const name = (filename || 'trace_' + Date.now()) + '.json';
    const json = JSON.stringify(trace, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[TraceRecorder] Saved ' + name + ' (' + json.length + ' bytes, ' + trace.entries.length + ' ticks).');
  },

  // ===================== FIXTURE GENERATORS =====================
  // These capture initialState from the CURRENT live game state and produce
  // deterministic input sequences for Unity parity testing.

  // ---- IDLE TRACE ----
  // Player standing still for N ticks.
  generateIdleTrace(ticks) {
    const n = ticks || 120;
    const trace = {
      initialState: serializeGameState(),
      entries: [],
    };
    for (let i = 0; i < n; i++) {
      trace.entries.push({
        tick: i,
        moveX: 0,
        moveY: 0,
        shootHeld: false,
        mouseX: 0, mouseY: 0,
        mouseWorldX: 0, mouseWorldY: 0,
        arrowAimDir: 0, arrowShooting: false,
        meleePressed: false,
        dashPressed: false,
        reloadPressed: false,
        interactPressed: false,
        usePotionPressed: false,
        quickslot: 0,
      });
    }
    console.log('[TraceRecorder] Generated idle trace: ' + n + ' ticks.');
    return trace;
  },

  // ---- MOVEMENT TRACE ----
  // 60 ticks right, 60 ticks up, 60 ticks diagonal (right+up), 60 ticks idle.
  generateMovementTrace() {
    const trace = {
      initialState: serializeGameState(),
      entries: [],
    };
    let tick = 0;

    // 60 ticks: move right
    for (let i = 0; i < 60; i++) {
      trace.entries.push({
        tick: tick++, moveX: 1, moveY: 0,
        shootHeld: false, mouseX: 0, mouseY: 0, mouseWorldX: 0, mouseWorldY: 0, arrowAimDir: 0, arrowShooting: false,
        meleePressed: false, dashPressed: false, reloadPressed: false,
        interactPressed: false, usePotionPressed: false, quickslot: 0,
      });
    }
    // 60 ticks: move up
    for (let i = 0; i < 60; i++) {
      trace.entries.push({
        tick: tick++, moveX: 0, moveY: -1,
        shootHeld: false, mouseX: 0, mouseY: 0, mouseWorldX: 0, mouseWorldY: 0, arrowAimDir: 0, arrowShooting: false,
        meleePressed: false, dashPressed: false, reloadPressed: false,
        interactPressed: false, usePotionPressed: false, quickslot: 0,
      });
    }
    // 60 ticks: move diagonal (right + up)
    for (let i = 0; i < 60; i++) {
      trace.entries.push({
        tick: tick++, moveX: 1, moveY: -1,
        shootHeld: false, mouseX: 0, mouseY: 0, mouseWorldX: 0, mouseWorldY: 0, arrowAimDir: 0, arrowShooting: false,
        meleePressed: false, dashPressed: false, reloadPressed: false,
        interactPressed: false, usePotionPressed: false, quickslot: 0,
      });
    }
    // 60 ticks: idle
    for (let i = 0; i < 60; i++) {
      trace.entries.push({
        tick: tick++, moveX: 0, moveY: 0,
        shootHeld: false, mouseX: 0, mouseY: 0, mouseWorldX: 0, mouseWorldY: 0, arrowAimDir: 0, arrowShooting: false,
        meleePressed: false, dashPressed: false, reloadPressed: false,
        interactPressed: false, usePotionPressed: false, quickslot: 0,
      });
    }

    console.log('[TraceRecorder] Generated movement trace: ' + tick + ' ticks.');
    return trace;
  },

  // ---- BULLET TRACE ----
  // Player shoots right for 30 ticks, then stops for 30 ticks.
  generateBulletTrace() {
    const trace = {
      initialState: serializeGameState(),
      entries: [],
    };
    let tick = 0;

    // Aim to the right of the player (screen center + offset)
    const aimX = (typeof canvas !== 'undefined' ? canvas.width / 2 : 640) + 200;
    const aimY = typeof canvas !== 'undefined' ? canvas.height / 2 : 360;
    // World-space aim: player.x + offset to the right (200px / WORLD_ZOOM in world coords)
    const p = GameState.player;
    const zoom = typeof WORLD_ZOOM !== 'undefined' ? WORLD_ZOOM : 0.85;
    const worldAimX = p.x + 200 / zoom;
    const worldAimY = p.y - 30; // getAimDir uses (player.y - 30) as reference

    // 30 ticks: shoot right
    for (let i = 0; i < 30; i++) {
      trace.entries.push({
        tick: tick++, moveX: 0, moveY: 0,
        shootHeld: true, mouseX: aimX, mouseY: aimY, mouseWorldX: worldAimX, mouseWorldY: worldAimY, arrowAimDir: 0, arrowShooting: false,
        meleePressed: false, dashPressed: false, reloadPressed: false,
        interactPressed: false, usePotionPressed: false, quickslot: 0,
      });
    }
    // 30 ticks: stop shooting
    for (let i = 0; i < 30; i++) {
      trace.entries.push({
        tick: tick++, moveX: 0, moveY: 0,
        shootHeld: false, mouseX: aimX, mouseY: aimY, mouseWorldX: worldAimX, mouseWorldY: worldAimY, arrowAimDir: 0, arrowShooting: false,
        meleePressed: false, dashPressed: false, reloadPressed: false,
        interactPressed: false, usePotionPressed: false, quickslot: 0,
      });
    }

    console.log('[TraceRecorder] Generated bullet trace: ' + tick + ' ticks.');
    return trace;
  },
};

console.log('[TraceRecorder] Loaded. Commands: /trace start, /trace stop');
