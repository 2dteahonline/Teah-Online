/**
 * Neural Spar Bot Inference — loads exported MLP weights and runs
 * the trained policy at 60fps in the browser.
 *
 * Usage (in sparSystem.js):
 *   // Load once at startup
 *   const neuralPolicy = await NeuralSparPolicy.load('training/exports/best_model.json');
 *
 *   // Each frame in _tickOneBot:
 *   const obs = neuralPolicy.buildObs(bot, enemy, bullets, arenaW, arenaH);
 *   const action = neuralPolicy.getAction(obs);
 *   // action is 0-9 index into ACTION_NAMES
 *   const { moveX, moveY, shoot } = neuralPolicy.actionToMovement(action, bot, enemy);
 *
 * The policy is a small MLP (~24K params) — inference is <0.1ms per call.
 */

const NeuralSparPolicy = (() => {
  // Constants matching Python spar_sim.py
  const ARENA_W = 1152;
  const ARENA_H = 960;
  const PLAYER_BASE_SPEED = GAME_CONFIG.PLAYER_BASE_SPEED || 7.5;
  const BULLET_SPEED = GAME_CONFIG.BULLET_SPEED || 9;
  const ENTITY_R = GAME_CONFIG.ENTITY_R || 29;
  const PLAYER_HITBOX_Y = GAME_CONFIG.PLAYER_HITBOX_Y || -25;
  const HP_BASELINE = 100;
  const CTX_FREEZE_DURATION = 15;
  const MAX_MATCH_FRAMES = 3600;

  const ACTION_NAMES = [
    'idle', 'push', 'retreat', 'strafe_left', 'strafe_right',
    'dodge_left', 'dodge_right', 'descend', 'ascend', 'shoot',
  ];

  /**
   * Tiny MLP forward pass — pure JS, no dependencies.
   * Layers: [{weight: 2D, bias: 1D, activation: 'tanh'|'none'}, ...]
   */
  function mlpForward(layers, input) {
    let x = input;
    for (const layer of layers) {
      const w = layer.weight; // [out_dim][in_dim]
      const b = layer.bias;   // [out_dim]
      const out = new Float32Array(w.length);
      for (let i = 0; i < w.length; i++) {
        let sum = b[i];
        const row = w[i];
        for (let j = 0; j < row.length; j++) {
          sum += row[j] * x[j];
        }
        if (layer.activation === 'tanh') {
          out[i] = Math.tanh(sum);
        } else {
          out[i] = sum;
        }
      }
      x = out;
    }
    return x;
  }

  /**
   * Softmax over logits, return action index (argmax for deterministic,
   * or sample for stochastic).
   */
  function softmaxAction(logits, deterministic = true) {
    // Numerically stable softmax
    let maxVal = -Infinity;
    for (let i = 0; i < logits.length; i++) {
      if (logits[i] > maxVal) maxVal = logits[i];
    }
    let sumExp = 0;
    const probs = new Float32Array(logits.length);
    for (let i = 0; i < logits.length; i++) {
      probs[i] = Math.exp(logits[i] - maxVal);
      sumExp += probs[i];
    }
    for (let i = 0; i < probs.length; i++) {
      probs[i] /= sumExp;
    }

    if (deterministic) {
      // Argmax
      let bestIdx = 0;
      for (let i = 1; i < probs.length; i++) {
        if (probs[i] > probs[bestIdx]) bestIdx = i;
      }
      return bestIdx;
    }

    // Stochastic sampling
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (r < cum) return i;
    }
    return probs.length - 1;
  }

  class Policy {
    constructor(modelData) {
      this.obsDim = modelData.obs_dim;
      this.actDim = modelData.act_dim;
      this.actionNames = modelData.action_names;
      // Only need policy layers for inference (skip value head)
      this.layers = modelData.layers.filter(l => l.name !== 'value');
    }

    /**
     * Build observation vector matching Python spar_sim._fighter_obs().
     * All values normalized to [-1, 1] or [0, 1].
     *
     * @param {Object} me - bot entity {x, y, hp, gun, freeze_timer, ...}
     * @param {Object} enemy - target entity
     * @param {Array} bullets - all bullets in flight
     * @param {number} matchFrame - current match frame count
     */
    buildObs(me, enemy, bullets, matchFrame) {
      const mx = me.x / ARENA_W;
      const my = me.y / ARENA_H;
      const ex = enemy.x / ARENA_W;
      const ey = enemy.y / ARENA_H;

      const relX = (enemy.x - me.x) / ARENA_W;
      const relY = (enemy.y - me.y) / ARENA_H;

      const dx = enemy.x - me.x;
      const dy = enemy.y - me.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const normDist = Math.min(1.0, dist / (ARENA_W * 0.7));

      // Velocities (from last frame movement)
      const myVx = (me._neuralVx || 0) / PLAYER_BASE_SPEED;
      const myVy = (me._neuralVy || 0) / PLAYER_BASE_SPEED;
      const enVx = (enemy._neuralVx || 0) / PLAYER_BASE_SPEED;
      const enVy = (enemy._neuralVy || 0) / PLAYER_BASE_SPEED;

      // HP
      const myHp = (me.hp || HP_BASELINE) / HP_BASELINE;
      const enHp = (enemy.hp || HP_BASELINE) / HP_BASELINE;

      // Gun state
      const myGun = me.gun || {};
      const enGun = enemy.gun || {};
      const myAmmo = (myGun.ammo || 0) / (myGun.magSize || 30);
      const enAmmo = (enGun.ammo || 0) / (enGun.magSize || 30);
      const myReloading = myGun.reloading ? 1.0 : 0.0;
      const enReloading = enGun.reloading ? 1.0 : 0.0;
      const myCanShoot = (!myGun.reloading && (myGun.ammo || 0) > 0 && (myGun.shootCD || 0) <= 0) ? 1.0 : 0.0;
      const myFreeze = (me.freeze_timer || 0) / CTX_FREEZE_DURATION;

      // Wall distances
      const wallLeft = me.x / ARENA_W;
      const wallRight = (ARENA_W - me.x) / ARENA_W;
      const wallTop = me.y / ARENA_H;
      const wallBottom = (ARENA_H - me.y) / ARENA_H;

      // Bottom advantage
      const bottomAdv = (me.y - enemy.y) / ARENA_H;

      // Match progress
      const matchProgress = (matchFrame || 0) / MAX_MATCH_FRAMES;

      // Base obs: 25 floats
      const obs = new Float32Array(this.obsDim);
      obs[0] = mx; obs[1] = my;
      obs[2] = ex; obs[3] = ey;
      obs[4] = relX; obs[5] = relY;
      obs[6] = normDist;
      obs[7] = myVx; obs[8] = myVy;
      obs[9] = enVx; obs[10] = enVy;
      obs[11] = myHp; obs[12] = enHp;
      obs[13] = myAmmo; obs[14] = enAmmo;
      obs[15] = myReloading; obs[16] = enReloading;
      obs[17] = myCanShoot;
      obs[18] = myFreeze;
      obs[19] = wallLeft; obs[20] = wallRight;
      obs[21] = wallTop; obs[22] = wallBottom;
      obs[23] = bottomAdv;
      obs[24] = matchProgress;

      // Bullet threats: nearest 5 enemy bullets (20 floats)
      // Real bullets use b.sparTeam = 'teamA'/'teamB', not b.team
      const mySparTeam = me.sparTeam || me.team;
      const hitY = me.y + PLAYER_HITBOX_Y;
      const threats = [];
      if (bullets) {
        for (const b of bullets) {
          if (b.sparTeam === mySparTeam) continue; // skip own team's bullets
          const bdx = b.x - me.x;
          const bdy = b.y - hitY;
          const distSq = bdx * bdx + bdy * bdy;
          threats.push({ distSq, rx: bdx / ARENA_W, ry: bdy / ARENA_H,
                         vx: (b.vx || 0) / BULLET_SPEED, vy: (b.vy || 0) / BULLET_SPEED });
        }
        threats.sort((a, b) => a.distSq - b.distSq);
      }

      for (let i = 0; i < 5; i++) {
        const base = 25 + i * 4;
        if (i < threats.length) {
          obs[base] = threats[i].rx;
          obs[base + 1] = threats[i].ry;
          obs[base + 2] = threats[i].vx;
          obs[base + 3] = threats[i].vy;
        }
        // else: already 0 from Float32Array init
      }

      return obs;
    }

    /**
     * Run policy forward pass and return action index.
     * @param {Float32Array} obs - observation vector from buildObs()
     * @param {boolean} deterministic - if true, argmax; if false, sample
     * @returns {number} action index 0-9
     */
    getAction(obs, deterministic = true) {
      const output = mlpForward(this.layers, obs);
      return softmaxAction(output, deterministic);
    }

    /**
     * Convert action index to movement + shoot intent.
     * Matches Python spar_sim.action_to_movement().
     */
    actionToMovement(action, me, enemy) {
      const s = me.speed || PLAYER_BASE_SPEED;
      const dx = enemy.x - me.x;
      const dy = enemy.y - me.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) dist = 1;

      let moveX = 0, moveY = 0, shoot = false;

      switch (action) {
        case 0: // idle
          moveX = s * 0.3 * (me.x < ARENA_W / 2 ? 1 : -1);
          break;
        case 1: // push toward enemy
          moveX = (dx / dist) * s;
          moveY = (dy / dist) * s;
          break;
        case 2: // retreat from enemy
          moveX = -(dx / dist) * s;
          moveY = -(dy / dist) * s;
          break;
        case 3: // strafe left
          moveX = -s;
          break;
        case 4: // strafe right
          moveX = s;
          break;
        case 5: // dodge left (perpendicular CCW)
          moveX = (dy / dist) * s;
          moveY = -(dx / dist) * s;
          break;
        case 6: // dodge right (perpendicular CW)
          moveX = -(dy / dist) * s;
          moveY = (dx / dist) * s;
          break;
        case 7: // descend
          moveY = s;
          break;
        case 8: // ascend
          moveY = -s;
          break;
        case 9: // shoot + hold position
          shoot = true;
          moveX = s * 0.2 * (me.x < enemy.x ? 1 : -1);
          break;
      }

      return { moveX, moveY, shoot };
    }

    /**
     * Get human-readable action name.
     */
    getActionName(action) {
      return this.actionNames[action] || 'unknown';
    }
  }

  return {
    /**
     * Load model from JSON file. Returns a Policy instance.
     * @param {string} url - path to exported model JSON
     */
    async load(url) {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to load model: ${resp.status}`);
      const data = await resp.json();
      console.log(`[NeuralSpar] Loaded model v${data.version}: ${data.obs_dim} obs → ${data.act_dim} actions, ${data.hidden} hidden`);
      return new Policy(data);
    },

    /**
     * Load model from inline JSON object (for embedding in JS).
     */
    fromJSON(data) {
      return new Policy(data);
    },

    ACTION_NAMES,
  };
})();
