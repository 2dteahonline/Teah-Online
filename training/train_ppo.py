"""
PPO Self-Play Training for Spar Bot Neural Execution Layer.

Architecture:
  - Small MLP policy (45 obs → 128 → 128 → 10 actions + 1 value)
  - Self-play: current policy vs lagged copy (updated every K iterations)
  - PPO clipped objective with GAE
  - Exports trained weights to JSON for JS/Unity consumption

Usage:
    python training/train_ppo.py                    # train from scratch
    python training/train_ppo.py --resume latest    # resume from checkpoint
    python training/train_ppo.py --export model.json  # export for JS

Requirements: torch, numpy (pip install torch)
"""

import argparse
import json
import math
import os
import time
from collections import deque
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.distributions import Categorical

from spar_sim import SparSim, Gun, NUM_ACTIONS, HP_BASELINE, SPAWN_A, SPAWN_B

# Graceful Ctrl+C — finish current iteration, save checkpoint + export
import signal
_stop_requested = False
def _sigint_handler(sig, frame):
    global _stop_requested
    if _stop_requested:
        raise KeyboardInterrupt  # second Ctrl+C = force quit
    _stop_requested = True
    print("\n[Ctrl+C] Finishing current iteration, then saving...")
signal.signal(signal.SIGINT, _sigint_handler)

import sys
class _TeeWriter:
    """Write to both console and log file."""
    def __init__(self, *streams):
        self.streams = streams
    def write(self, data):
        for s in self.streams:
            s.write(data)
            s.flush()
    def flush(self):
        for s in self.streams:
            s.flush()

# ============================================================
# HYPERPARAMETERS
# ============================================================
OBS_DIM = 45              # 25 base + 20 bullet obs (5 bullets × 4)
ACT_DIM = NUM_ACTIONS     # 10 discrete actions
HIDDEN = 128              # MLP hidden layer size
LR = 3e-4                 # learning rate
GAMMA = 0.99              # discount factor
GAE_LAMBDA = 0.95         # GAE lambda
CLIP_EPS = 0.2            # PPO clip ratio
ENTROPY_COEF = 0.02       # entropy bonus — higher to prevent action collapse
VALUE_COEF = 0.5          # value loss weight
MAX_GRAD_NORM = 0.5       # gradient clipping

N_ENVS = 16               # parallel environments
N_STEPS = 256             # steps per rollout per env
BATCH_SIZE = 512           # minibatch size for updates
N_EPOCHS = 4              # PPO epochs per rollout
TOTAL_ITERS = 2000        # total training iterations
OPPONENT_UPDATE = 10       # update opponent every N iterations

# Gun build: fixed 50/50 to match live 1v1 (js/authority/sparSystem.js line 2176)
# Hidden build randomization creates latent dynamics the policy can't observe
GUN_BUILDS = [
    (50, 50, 0),   # balanced — matches live spar
]

SAVE_DIR = Path(__file__).parent / "checkpoints"
EXPORT_DIR = Path(__file__).parent / "exports"


# ============================================================
# POLICY NETWORK
# ============================================================
class SparPolicy(nn.Module):
    """Small MLP: obs → (action logits, value estimate).
    Designed to be small enough to run in JS at 60fps."""

    def __init__(self, obs_dim=OBS_DIM, act_dim=ACT_DIM, hidden=HIDDEN):
        super().__init__()
        self.shared = nn.Sequential(
            nn.Linear(obs_dim, hidden),
            nn.Tanh(),
            nn.Linear(hidden, hidden),
            nn.Tanh(),
        )
        self.policy_head = nn.Linear(hidden, act_dim)
        self.value_head = nn.Linear(hidden, 1)

        # Initialize with small weights for stable start
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.orthogonal_(m.weight, gain=0.5)
                nn.init.zeros_(m.bias)
        # Policy head: smaller init for near-uniform start
        nn.init.orthogonal_(self.policy_head.weight, gain=0.01)

    def forward(self, obs):
        h = self.shared(obs)
        logits = self.policy_head(h)
        value = self.value_head(h).squeeze(-1)
        return logits, value

    def get_action(self, obs, deterministic=False):
        """Sample action from policy. Returns action, log_prob, value."""
        logits, value = self.forward(obs)
        dist = Categorical(logits=logits)
        if deterministic:
            action = logits.argmax(dim=-1)
        else:
            action = dist.sample()
        return action, dist.log_prob(action), value

    def evaluate(self, obs, actions):
        """Evaluate given actions. Returns log_probs, entropy, values."""
        logits, value = self.forward(obs)
        dist = Categorical(logits=logits)
        return dist.log_prob(actions), dist.entropy(), value


# ============================================================
# ROLLOUT BUFFER
# ============================================================
class RolloutBuffer:
    """Stores rollout data for PPO updates."""

    def __init__(self, n_envs, n_steps, obs_dim):
        self.obs = np.zeros((n_steps, n_envs, obs_dim), dtype=np.float32)
        self.actions = np.zeros((n_steps, n_envs), dtype=np.int64)
        self.log_probs = np.zeros((n_steps, n_envs), dtype=np.float32)
        self.rewards = np.zeros((n_steps, n_envs), dtype=np.float32)
        self.values = np.zeros((n_steps, n_envs), dtype=np.float32)
        self.dones = np.zeros((n_steps, n_envs), dtype=np.float32)
        self.ptr = 0

    def store(self, obs, actions, log_probs, rewards, values, dones):
        i = self.ptr
        self.obs[i] = obs
        self.actions[i] = actions
        self.log_probs[i] = log_probs
        self.rewards[i] = rewards
        self.values[i] = values
        self.dones[i] = dones
        self.ptr += 1

    def compute_gae(self, last_values, last_dones):
        """Compute GAE advantages and returns."""
        n_steps = self.ptr
        advantages = np.zeros_like(self.rewards)
        last_gae = 0.0

        for t in reversed(range(n_steps)):
            if t == n_steps - 1:
                next_values = last_values
                next_dones = last_dones
            else:
                next_values = self.values[t + 1]
                next_dones = self.dones[t + 1]

            delta = self.rewards[t] + GAMMA * next_values * (1 - next_dones) - self.values[t]
            advantages[t] = last_gae = delta + GAMMA * GAE_LAMBDA * (1 - next_dones) * last_gae

        returns = advantages + self.values[:n_steps]
        return advantages, returns

    def get_batches(self, advantages, returns, batch_size):
        """Yield shuffled minibatches."""
        n_steps = self.ptr
        n_envs = self.obs.shape[1]
        total = n_steps * n_envs

        # Flatten
        obs_flat = self.obs[:n_steps].reshape(total, -1)
        act_flat = self.actions[:n_steps].reshape(total)
        lp_flat = self.log_probs[:n_steps].reshape(total)
        adv_flat = advantages.reshape(total)
        ret_flat = returns.reshape(total)

        # Normalize advantages
        adv_flat = (adv_flat - adv_flat.mean()) / (adv_flat.std() + 1e-8)

        # Shuffle and yield batches
        indices = np.random.permutation(total)
        for start in range(0, total, batch_size):
            end = start + batch_size
            batch_idx = indices[start:end]
            yield (
                torch.tensor(obs_flat[batch_idx]),
                torch.tensor(act_flat[batch_idx]),
                torch.tensor(lp_flat[batch_idx]),
                torch.tensor(adv_flat[batch_idx]),
                torch.tensor(ret_flat[batch_idx]),
            )

    def reset(self):
        self.ptr = 0


# ============================================================
# PARALLEL ENVIRONMENT WRAPPER
# ============================================================
class ParallelSparEnv:
    """Runs N independent spar matches. Self-play: both sides use policies."""

    def __init__(self, n_envs):
        self.n_envs = n_envs
        self.envs = []
        self.completed_matches = []  # accumulate stats before auto-reset clears them
        for _ in range(n_envs):
            build = GUN_BUILDS[np.random.randint(len(GUN_BUILDS))]
            gun = Gun.from_points(*build)
            self.envs.append(SparSim(gun_a=gun, gun_b=gun))

    def reset_all(self):
        """Reset all environments. Returns obs arrays for side A and B."""
        obs_a = np.zeros((self.n_envs, OBS_DIM), dtype=np.float32)
        obs_b = np.zeros((self.n_envs, OBS_DIM), dtype=np.float32)
        for i, env in enumerate(self.envs):
            build = GUN_BUILDS[np.random.randint(len(GUN_BUILDS))]
            gun = Gun.from_points(*build)
            env.gun_a_template = gun
            env.gun_b_template = gun
            obs = env.reset()
            obs_a[i] = obs['a']
            obs_b[i] = obs['b']
        return obs_a, obs_b

    def step(self, actions_a, actions_b):
        """Step all envs. Returns obs_a, obs_b, rewards_a, rewards_b, dones."""
        obs_a = np.zeros((self.n_envs, OBS_DIM), dtype=np.float32)
        obs_b = np.zeros((self.n_envs, OBS_DIM), dtype=np.float32)
        rewards_a = np.zeros(self.n_envs, dtype=np.float32)
        rewards_b = np.zeros(self.n_envs, dtype=np.float32)
        dones = np.zeros(self.n_envs, dtype=np.float32)

        for i, env in enumerate(self.envs):
            obs, ra, rb, done = env.step(int(actions_a[i]), int(actions_b[i]))
            obs_a[i] = obs['a']
            obs_b[i] = obs['b']
            rewards_a[i] = ra
            rewards_b[i] = rb
            dones[i] = float(done)

            # Capture stats BEFORE auto-reset clears them
            if done:
                self.completed_matches.append({
                    'winner': env.winner,
                    'frames': env.frame,
                    'a_hp': env.a.hp,
                    'b_hp': env.b.hp,
                    'a_shots': env.stats['a_shots_fired'],
                    'b_shots': env.stats['b_shots_fired'],
                    'a_hits': env.stats['a_shots_hit'],
                    'b_hits': env.stats['b_shots_hit'],
                })
                # Auto-reset
                build = GUN_BUILDS[np.random.randint(len(GUN_BUILDS))]
                gun = Gun.from_points(*build)
                env.gun_a_template = gun
                env.gun_b_template = gun
                new_obs = env.reset()
                obs_a[i] = new_obs['a']
                obs_b[i] = new_obs['b']

        return obs_a, obs_b, rewards_a, rewards_b, dones

    def drain_completed(self):
        """Return and clear list of completed match stats."""
        stats = self.completed_matches
        self.completed_matches = []
        return stats


# ============================================================
# TRAINING LOOP
# ============================================================
def train(args):
    device = torch.device('cpu')  # CPU-only for now

    # Create policy and opponent
    policy = SparPolicy().to(device)
    opponent = SparPolicy().to(device)
    opponent.load_state_dict(policy.state_dict())
    opponent.eval()

    optimizer = optim.Adam(policy.parameters(), lr=LR, eps=1e-5)

    # Environment
    env = ParallelSparEnv(N_ENVS)
    buffer = RolloutBuffer(N_ENVS, N_STEPS, OBS_DIM)

    # Tracking
    match_history = deque(maxlen=200)
    best_win_rate = 0.0
    start_iter = 0

    # Resume from checkpoint
    if args.resume:
        ckpt_path = _find_checkpoint(args.resume)
        if ckpt_path:
            ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
            policy.load_state_dict(ckpt['policy'])
            opponent.load_state_dict(ckpt['opponent'])
            optimizer.load_state_dict(ckpt['optimizer'])
            start_iter = ckpt.get('iteration', 0)
            best_win_rate = ckpt.get('best_win_rate', 0.0)
            print(f"Resumed from {ckpt_path} at iteration {start_iter}")
        else:
            print(f"No checkpoint found for '{args.resume}', starting fresh")

    # Initialize environments
    obs_a, obs_b = env.reset_all()

    # Reset interrupt flag for this training run
    global _stop_requested
    _stop_requested = False

    # Log to file + console
    log_dir = Path(__file__).parent / "logs"
    os.makedirs(log_dir, exist_ok=True)
    log_path = log_dir / f"train_{time.strftime('%Y%m%d_%H%M%S')}.log"
    _log_file = open(log_path, 'w')
    sys.stdout = _TeeWriter(sys.__stdout__, _log_file)
    print(f"Logging to {log_path}")

    print(f"\n{'='*60}")
    print(f"PPO Self-Play Training")
    print(f"  Obs: {OBS_DIM}, Actions: {ACT_DIM}, Hidden: {HIDDEN}")
    print(f"  Envs: {N_ENVS}, Steps/rollout: {N_STEPS}, Batch: {BATCH_SIZE}")
    print(f"  Total iterations: {TOTAL_ITERS}")
    print(f"  Params: {sum(p.numel() for p in policy.parameters()):,}")
    print(f"{'='*60}\n")

    t_start = time.time()

    # Opener diversity tracking (persists across rollouts)
    _opener_hashes = set()
    _opener_frames = np.zeros(N_ENVS, dtype=np.int64)
    _opener_buf = [[] for _ in range(N_ENVS)]

    iteration = start_iter  # ensure defined for final save if loop never runs
    for iteration in range(start_iter, TOTAL_ITERS):
        if _stop_requested:
            break
        buffer.reset()
        policy.eval()

        # ---- Collect rollout ----
        action_counts = np.zeros(ACT_DIM, dtype=np.int64)
        action_counts_b = np.zeros(ACT_DIM, dtype=np.int64)
        max_streak = 0
        _streak = np.zeros(N_ENVS, dtype=np.int64)
        _prev_act = np.full(N_ENVS, -1, dtype=np.int64)
        for step in range(N_STEPS):
            with torch.no_grad():
                obs_a_t = torch.tensor(obs_a, dtype=torch.float32)
                obs_b_t = torch.tensor(obs_b, dtype=torch.float32)

                # Current policy plays side A
                act_a, lp_a, val_a = policy.get_action(obs_a_t)
                # Opponent plays side B
                act_b, _, _ = opponent.get_action(obs_b_t)

            # Track action distribution (both sides) + repeat streak
            act_a_np = act_a.numpy()
            act_b_np = act_b.numpy()
            for a in act_a_np:
                action_counts[a] += 1
            for a in act_b_np:
                action_counts_b[a] += 1
            for i in range(N_ENVS):
                if act_a_np[i] == _prev_act[i]:
                    _streak[i] += 1
                else:
                    _streak[i] = 0
                _prev_act[i] = act_a_np[i]
            max_streak = max(max_streak, int(_streak.max()))

            # Record opener actions (first 30 frames per match)
            for i in range(N_ENVS):
                if _opener_frames[i] < 30:
                    _opener_buf[i].append(int(act_a_np[i]))
                _opener_frames[i] += 1

            # Step environments
            new_obs_a, new_obs_b, rew_a, rew_b, dones = env.step(
                act_a_np, act_b_np
            )

            # Store side A data (we're training side A)
            buffer.store(obs_a, act_a_np, lp_a.numpy(),
                         rew_a, val_a.numpy(), dones)

            # Track completed matches
            for s in env.drain_completed():
                match_history.append(s)

            # Hash opener sequences of completed matches
            for i in range(N_ENVS):
                if dones[i]:
                    if len(_opener_buf[i]) >= 10:
                        _opener_hashes.add(hash(tuple(_opener_buf[i][:30])))
                    _opener_buf[i] = []
                    _opener_frames[i] = 0

            obs_a = new_obs_a
            obs_b = new_obs_b

        # ---- Compute GAE ----
        with torch.no_grad():
            _, last_values = policy(torch.tensor(obs_a, dtype=torch.float32))
            last_values = last_values.numpy()
        # Use current dones (matches auto-reset, so these are the new episode starts)
        last_dones = np.zeros(N_ENVS, dtype=np.float32)
        advantages, returns = buffer.compute_gae(last_values, last_dones)

        # ---- PPO Update ----
        policy.train()
        total_pg_loss = 0
        total_v_loss = 0
        total_entropy = 0
        n_updates = 0

        for epoch in range(N_EPOCHS):
            for obs_b_batch, act_b_batch, old_lp, adv, ret in buffer.get_batches(advantages, returns, BATCH_SIZE):
                new_lp, entropy, new_val = policy.evaluate(obs_b_batch, act_b_batch)

                # PPO clipped objective
                ratio = torch.exp(new_lp - old_lp)
                surr1 = ratio * adv
                surr2 = torch.clamp(ratio, 1 - CLIP_EPS, 1 + CLIP_EPS) * adv
                pg_loss = -torch.min(surr1, surr2).mean()

                # Value loss
                v_loss = ((new_val - ret) ** 2).mean()

                # Total loss
                loss = pg_loss + VALUE_COEF * v_loss - ENTROPY_COEF * entropy.mean()

                optimizer.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(policy.parameters(), MAX_GRAD_NORM)
                optimizer.step()

                total_pg_loss += pg_loss.item()
                total_v_loss += v_loss.item()
                total_entropy += entropy.mean().item()
                n_updates += 1

        # ---- Opponent update (self-play) ----
        if (iteration + 1) % OPPONENT_UPDATE == 0:
            opponent.load_state_dict(policy.state_dict())

        # ---- Logging ----
        if (iteration + 1) % 5 == 0 or iteration == start_iter:
            elapsed = time.time() - t_start
            fps = (iteration - start_iter + 1) * N_ENVS * N_STEPS / elapsed

            # Match stats
            if match_history:
                recent = list(match_history)[-50:]
                a_wins = sum(1 for m in recent if m['winner'] == 'a')
                b_wins = sum(1 for m in recent if m['winner'] == 'b')
                draws = sum(1 for m in recent if m['winner'] == 'draw')
                avg_frames = np.mean([m['frames'] for m in recent])
                avg_hits_a = np.mean([m['a_hits'] for m in recent]) if recent else 0
                avg_hits_b = np.mean([m['b_hits'] for m in recent]) if recent else 0
                win_rate = a_wins / len(recent)
            else:
                a_wins = b_wins = draws = 0
                avg_frames = avg_hits_a = avg_hits_b = win_rate = 0

            # Action distribution (both sides)
            AN = ['idl','psh','ret','sL','sR','dL','dR','des','asc','sht']
            act_total = action_counts.sum()
            act_pcts = (action_counts / max(1, act_total) * 100).astype(int)
            act_str = ' '.join(f"{AN[i]}:{act_pcts[i]}%" for i in range(ACT_DIM))

            act_total_b = action_counts_b.sum()
            act_pcts_b = (action_counts_b / max(1, act_total_b) * 100).astype(int)
            act_str_b = ' '.join(f"{AN[i]}:{act_pcts_b[i]}%" for i in range(ACT_DIM))

            # Shots per match (key metric for passivity)
            avg_shots_a = np.mean([m['a_shots'] for m in recent]) if match_history and recent else 0

            print(f"iter {iteration+1:5d} | "
                  f"pg {total_pg_loss/max(1,n_updates):+.4f} | "
                  f"ent {total_entropy/max(1,n_updates):.3f} | "
                  f"fps {fps:.0f} | "
                  f"W {a_wins}-{b_wins}-{draws} ({win_rate:.1%}) | "
                  f"frm {avg_frames:.0f} | "
                  f"hit {avg_hits_a:.1f}/{avg_hits_b:.1f} | "
                  f"sht {avg_shots_a:.0f} | "
                  f"strk {max_streak} | opn {len(_opener_hashes)}")
            print(f"  A: {act_str}")
            print(f"  B: {act_str_b}")
            if (iteration + 1) % 100 == 0 and _opener_hashes:
                print(f"  [Opener diversity] {len(_opener_hashes)} unique sequences — resetting counter")
                _opener_hashes = set()

        # ---- Checkpointing ----
        if (iteration + 1) % 50 == 0:
            _save_checkpoint(policy, opponent, optimizer, iteration + 1, best_win_rate)

        # ---- Periodic model export for browser testing (eval-gated) ----
        if (iteration + 1) % 100 == 0:
            eval_result = eval_live_start(policy, device)
            _log_eval(eval_result, f"iter{iteration+1}")
            if eval_result['passed']:
                export_weights(policy, EXPORT_DIR / f"model_iter{iteration+1}.json")
            else:
                print(f"  SKIPPED export iter{iteration+1}: {', '.join(eval_result['fail_reasons'])}")

        # ---- Export best model (eval-gated) ----
        if match_history:
            recent = list(match_history)[-50:]
            wr = sum(1 for m in recent if m['winner'] == 'a') / max(1, len(recent))
            if wr > best_win_rate and len(recent) >= 20:
                eval_result = eval_live_start(policy, device)
                _log_eval(eval_result, "best")
                if eval_result['passed']:
                    best_win_rate = wr
                    export_weights(policy, EXPORT_DIR / "best_model.json")
                else:
                    print(f"  SKIPPED best export: {', '.join(eval_result['fail_reasons'])}")

    # Final save (handles both normal completion and Ctrl+C)
    final_iter = iteration + 1
    _save_checkpoint(policy, opponent, optimizer, final_iter, best_win_rate)
    eval_result = eval_live_start(policy, device)
    _log_eval(eval_result, "final")
    if not eval_result['passed']:
        print(f"  WARNING: Final model failed eval: {', '.join(eval_result['fail_reasons'])}")
    export_weights(policy, EXPORT_DIR / "final_model.json")  # always export final
    if _stop_requested:
        export_weights(policy, EXPORT_DIR / f"model_iter{final_iter}.json")
        print(f"\nTraining interrupted at iteration {final_iter}. Model saved.")
    else:
        print(f"\nTraining complete. Best win rate: {best_win_rate:.1%}")
    print(f"Exported to {EXPORT_DIR / 'final_model.json'}")

    # Close log file
    sys.stdout = sys.__stdout__
    _log_file.close()
    print(f"Full log saved to {log_path}")


# ============================================================
# WEIGHT EXPORT — JSON for JS/Unity
# ============================================================
def export_weights(policy: SparPolicy, path: str):
    """Export policy weights as JSON for loading in JS or Unity.
    Format: list of layers, each with 'weight' (2D) and 'bias' (1D)."""
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)

    layers = []
    state = policy.state_dict()

    # Shared layers
    for i in range(2):  # 2 hidden layers
        w = state[f'shared.{i*2}.weight'].numpy().tolist()  # i*2 because Sequential has Linear, Tanh alternating
        b = state[f'shared.{i*2}.bias'].numpy().tolist()
        layers.append({'name': f'hidden_{i}', 'weight': w, 'bias': b, 'activation': 'tanh'})

    # Policy head
    w = state['policy_head.weight'].numpy().tolist()
    b = state['policy_head.bias'].numpy().tolist()
    layers.append({'name': 'policy', 'weight': w, 'bias': b, 'activation': 'none'})

    # Value head (included for completeness, not needed in JS inference)
    w = state['value_head.weight'].numpy().tolist()
    b = state['value_head.bias'].numpy().tolist()
    layers.append({'name': 'value', 'weight': w, 'bias': b, 'activation': 'none'})

    model_json = {
        'version': 1,
        'obs_dim': OBS_DIM,
        'act_dim': ACT_DIM,
        'hidden': HIDDEN,
        'layers': layers,
        'action_names': ['idle', 'push', 'retreat', 'strafe_left', 'strafe_right',
                         'dodge_left', 'dodge_right', 'descend', 'ascend', 'shoot'],
    }

    with open(path, 'w') as f:
        json.dump(model_json, f)
    size_kb = os.path.getsize(path) / 1024
    print(f"  Exported model to {path} ({size_kb:.1f} KB)")


# ============================================================
# EVAL GATE — reject collapsed policies before export
# ============================================================
def eval_live_start(policy: SparPolicy, device=torch.device('cpu')) -> dict:
    """Evaluate policy from exact live deployment start position.
    Checks for action collapse and degenerate movement patterns.
    Returns dict with pass/fail status and diagnostic stats."""
    AN = ['idle','push','retreat','strafe_left','strafe_right',
          'dodge_left','dodge_right','descend','ascend','shoot']

    result = {'passed': True, 'fail_reasons': []}

    # === Eval 1: Deterministic opener-bias check ===
    # 1 rollout, 180 frames, exact live start (A at SPAWN_B, B at SPAWN_A)
    # Both sides deterministic (argmax)
    sim = SparSim(gun_a=Gun.from_points(50, 50, 0), gun_b=Gun.from_points(50, 50, 0))
    sim.reset()
    # Force exact live positions: A at right, B at left
    sim.a.x, sim.a.y = SPAWN_B
    sim.b.x, sim.b.y = SPAWN_A
    sim.a.dir = 2  # face left toward enemy
    sim.b.dir = 3  # face right toward enemy

    action_counts = np.zeros(ACT_DIM, dtype=np.int64)
    frames_counted = 0

    for frame in range(180):
        obs = sim.get_obs()
        with torch.no_grad():
            obs_a_t = torch.tensor([obs['a']], dtype=torch.float32, device=device)
            obs_b_t = torch.tensor([obs['b']], dtype=torch.float32, device=device)
            logits_a, _ = policy(obs_a_t)
            logits_b, _ = policy(obs_b_t)
            act_a = logits_a.argmax(dim=-1).item()
            act_b = logits_b.argmax(dim=-1).item()

        if frame < 120:
            action_counts[act_a] += 1
            frames_counted += 1

        sim.step(act_a, act_b)
        if sim.done:
            break

    # FAIL if any single action > 50% over first 120 frames
    if frames_counted > 0:
        max_pct = float(action_counts.max()) / frames_counted
        dominant_idx = int(action_counts.argmax())
        result['eval1_dist'] = {AN[i]: int(action_counts[i]) for i in range(ACT_DIM)}
        result['eval1_max_pct'] = max_pct
        result['eval1_dominant'] = AN[dominant_idx]
        if max_pct > 0.50:
            result['passed'] = False
            result['fail_reasons'].append(
                f"Eval1: '{AN[dominant_idx]}' at {max_pct:.0%} > 50%")

    # === Eval 2: Stochastic robustness check ===
    # 8 episodes, trained=deterministic, opponent=stochastic (fixed seeds 0-7)
    saved_rng = random.getstate()
    saved_np_rng = np.random.get_state()
    saved_torch_rng = torch.random.get_rng_state()

    wall_lock_count = 0
    top_camp_count = 0

    for seed in range(8):
        random.seed(seed)
        np.random.seed(seed)
        torch.manual_seed(seed)

        sim2 = SparSim(gun_a=Gun.from_points(50, 50, 0), gun_b=Gun.from_points(50, 50, 0))
        sim2.reset()
        sim2.a.x, sim2.a.y = SPAWN_B
        sim2.b.x, sim2.b.y = SPAWN_A
        sim2.a.dir = 2
        sim2.b.dir = 3

        top_frames = 0

        for frame in range(180):
            obs = sim2.get_obs()
            with torch.no_grad():
                obs_a_t = torch.tensor([obs['a']], dtype=torch.float32, device=device)
                obs_b_t = torch.tensor([obs['b']], dtype=torch.float32, device=device)
                logits_a, _ = policy(obs_a_t)
                act_a = logits_a.argmax(dim=-1).item()  # deterministic

                logits_b, _ = policy(obs_b_t)
                dist_b = Categorical(logits=logits_b)
                act_b = dist_b.sample().item()  # stochastic

            sim2.step(act_a, act_b)

            if sim2.a.y < 100:
                top_frames += 1

            if sim2.done:
                break

        if sim2.a.y < 100 or sim2.a.y > 860:
            wall_lock_count += 1
        if top_frames >= 30:
            top_camp_count += 1

    # Restore RNG state
    random.setstate(saved_rng)
    np.random.set_state(saved_np_rng)
    torch.random.set_rng_state(saved_torch_rng)

    result['eval2_wall_lock'] = wall_lock_count
    result['eval2_top_camp'] = top_camp_count

    if wall_lock_count > 4:  # >50% of 8 episodes
        result['passed'] = False
        result['fail_reasons'].append(
            f"Eval2: wall-lock in {wall_lock_count}/8 episodes")
    if top_camp_count > 4:
        result['passed'] = False
        result['fail_reasons'].append(
            f"Eval2: top-camp in {top_camp_count}/8 episodes")

    return result


def _log_eval(result: dict, label: str):
    """Log eval gate results."""
    status = "PASS" if result['passed'] else "FAIL"
    print(f"  [Eval {label}] {status}")
    if 'eval1_dist' in result:
        print(f"    Eval1: dominant={result['eval1_dominant']} ({result['eval1_max_pct']:.0%})")
        print(f"    Dist: {result['eval1_dist']}")
    print(f"    Eval2: wall_lock={result.get('eval2_wall_lock', '?')}/8, "
          f"top_camp={result.get('eval2_top_camp', '?')}/8")
    for r in result.get('fail_reasons', []):
        print(f"    {r}")


# Need random import for eval RNG save/restore
import random


# ============================================================
# CHECKPOINT MANAGEMENT
# ============================================================
def _save_checkpoint(policy, opponent, optimizer, iteration, best_win_rate):
    os.makedirs(SAVE_DIR, exist_ok=True)
    path = SAVE_DIR / f"ckpt_{iteration:06d}.pt"
    torch.save({
        'policy': policy.state_dict(),
        'opponent': opponent.state_dict(),
        'optimizer': optimizer.state_dict(),
        'iteration': iteration,
        'best_win_rate': best_win_rate,
    }, path)
    # Also save as 'latest'
    latest = SAVE_DIR / "latest.pt"
    torch.save({
        'policy': policy.state_dict(),
        'opponent': opponent.state_dict(),
        'optimizer': optimizer.state_dict(),
        'iteration': iteration,
        'best_win_rate': best_win_rate,
    }, latest)
    print(f"  Checkpoint saved: {path}")


def _find_checkpoint(name):
    if name == 'latest':
        path = SAVE_DIR / "latest.pt"
        return path if path.exists() else None
    path = SAVE_DIR / f"{name}.pt"
    if path.exists():
        return path
    path = SAVE_DIR / name
    return path if path.exists() else None


# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='PPO Self-Play Spar Training')
    parser.add_argument('--resume', type=str, default=None,
                        help='Resume from checkpoint (e.g., "latest" or "ckpt_000500")')
    parser.add_argument('--export', type=str, default=None,
                        help='Export weights from checkpoint to JSON (e.g., "model.json")')
    parser.add_argument('--iters', type=int, default=TOTAL_ITERS,
                        help=f'Total training iterations (default: {TOTAL_ITERS})')
    args = parser.parse_args()

    if args.export:
        # Export mode: load latest checkpoint and export
        ckpt_path = _find_checkpoint(args.resume or 'latest')
        if not ckpt_path:
            print("No checkpoint found. Train first.")
            exit(1)
        ckpt = torch.load(ckpt_path, map_location='cpu', weights_only=False)
        policy = SparPolicy()
        policy.load_state_dict(ckpt['policy'])
        export_weights(policy, args.export)
    else:
        TOTAL_ITERS = args.iters
        train(args)
