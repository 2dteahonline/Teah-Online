// ===================== EVENT BUS =====================
// Lightweight pub/sub for decoupling game systems.
// Any system can subscribe to events without the emitter knowing about it.
// Usage:
//   Events.on('mob_killed', (data) => { /* react to mob death */ });
//   Events.emit('mob_killed', { mob, source, goldEarned });
//
// Events: mob_killed, wave_cleared, wave_started, player_damaged,
//         player_died, floor_changed
const Events = {
  _listeners: {},

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  },

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  },

  emit(event, data) {
    if (!this._listeners[event]) return;
    for (const cb of this._listeners[event]) {
      try { cb(data); } catch (e) { console.error(`Event '${event}' handler error:`, e); }
    }
  },

  // Remove all listeners (useful for reset/cleanup)
  clear() { this._listeners = {}; },
};
