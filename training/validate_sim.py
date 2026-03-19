"""
Validation harness: compare Python sim vs JS game physics.

Generates deterministic test scenarios, runs them in Python, exports
the expected results as JSON. A companion JS script (validate_sim.js)
runs the same scenarios in the real game engine and compares.

Usage:
    python validate_sim.py          # generates test_cases.json
    # Then run validate_sim.js in browser console to compare
"""

import json
import math
from spar_sim import (
    SparSim, Gun, position_clear, is_solid, bullet_hits_circle,
    TILE, ARENA_W, ARENA_H, ARENA_W_TILES, ARENA_H_TILES,
    PLAYER_WALL_HW, PLAYER_BASE_SPEED, BULLET_SPEED, ENTITY_R, PLAYER_HITBOX_Y,
    BULLET_HALF_LONG, BULLET_HALF_SHORT, SPAWN_A, SPAWN_B,
    CTX_DAMAGE, HP_BASELINE,
)


def test_collision_grid():
    """Validate wall detection matches JS collisionAscii."""
    results = []
    # Test all 4 corners + center + edge cases
    test_points = [
        (0, 0, True, "top-left corner"),
        (23, 0, True, "top-right corner"),
        (0, 19, True, "bottom-left corner"),
        (23, 19, True, "bottom-right corner"),
        (1, 1, False, "inner top-left"),
        (22, 18, False, "inner bottom-right"),
        (12, 10, False, "center"),
        (-1, 5, True, "out of bounds left"),
        (24, 5, True, "out of bounds right"),
        (5, -1, True, "out of bounds top"),
        (5, 20, True, "out of bounds bottom"),
    ]
    for col, row, expected, label in test_points:
        actual = is_solid(col, row)
        results.append({
            'test': f'isSolid({col},{row})',
            'label': label,
            'expected': expected,
            'actual': actual,
            'pass': actual == expected,
        })
    return results


def test_position_clear():
    """Validate movement collision at key positions."""
    results = []
    test_points = [
        # Center of arena — should be clear
        (576, 480, True, "arena center"),
        # Right against left wall (x=48+14=62 should be clear, x=48+13=61 should block)
        (62, 480, True, "just clear of left wall"),
        (61, 480, False, "touching left wall"),
        # Right against top wall
        (576, 62, True, "just clear of top wall"),
        (576, 61, False, "touching top wall"),
        # Bottom-right corner area (wall at col=23/row=19, so px+hw must be <1104)
        (ARENA_W - 63, ARENA_H - 63, True, "just clear of bottom-right"),
        (ARENA_W - 62, ARENA_H - 63, False, "touching right wall"),
    ]
    for px, py, expected, label in test_points:
        actual = position_clear(px, py, PLAYER_WALL_HW)
        results.append({
            'test': f'positionClear({px},{py},{PLAYER_WALL_HW})',
            'label': label,
            'expected': expected,
            'actual': actual,
            'pass': actual == expected,
        })
    return results


def test_bullet_hit():
    """Validate bullet-entity collision detection."""
    results = []
    # Horizontal bullet right at entity center
    results.append({
        'test': 'bullet_at_entity_center_horiz',
        'bx': 500, 'by': 500, 'bvx': 9, 'bvy': 0,
        'ex': 500, 'ey': 500 - PLAYER_HITBOX_Y,  # entity feet pos (hit center at 500)
        'expected': True,
    })
    # Bullet just outside range
    results.append({
        'test': 'bullet_outside_range_horiz',
        'bx': 500, 'by': 500, 'bvx': 9, 'bvy': 0,
        'ex': 500, 'ey': 500 - PLAYER_HITBOX_Y + ENTITY_R + BULLET_HALF_SHORT + 1,
        'expected': False,
    })
    # Vertical bullet hitting
    results.append({
        'test': 'bullet_at_entity_center_vert',
        'bx': 500, 'by': 500, 'bvx': 0, 'bvy': 9,
        'ex': 500, 'ey': 500 - PLAYER_HITBOX_Y,
        'expected': True,
    })
    # Edge case: bullet at max perpendicular distance
    results.append({
        'test': 'bullet_at_perp_edge',
        'bx': 500, 'by': 500, 'bvx': 9, 'bvy': 0,
        'ex': 500, 'ey': 500 - PLAYER_HITBOX_Y + ENTITY_R + BULLET_HALF_SHORT - 1,
        'expected': True,
    })

    for r in results:
        actual = bullet_hits_circle(
            r['bx'], r['by'], r['bvx'], r['bvy'],
            r['ex'], r['ey'] + PLAYER_HITBOX_Y, ENTITY_R
        )
        r['actual'] = actual
        r['pass'] = actual == r['expected']

    return results


def test_deterministic_match():
    """Run a deterministic match with fixed actions, record full state trace.
    JS can replay the same actions and compare frame-by-frame."""
    sim = SparSim(
        gun_a=Gun.from_points(50, 50, 0),
        gun_b=Gun.from_points(50, 50, 0),
    )
    sim.reset()

    # Fixed action sequence: alternating push/shoot for both sides
    actions_a = [1, 1, 1, 9, 4, 4, 9, 1, 1, 9,  # push, push, push, shoot, strafe...
                 3, 3, 9, 7, 7, 9, 2, 2, 9, 1,
                 1, 9, 4, 4, 9, 3, 3, 9, 7, 9]
    actions_b = [2, 3, 3, 9, 3, 3, 9, 2, 2, 9,
                 4, 4, 9, 8, 8, 9, 1, 1, 9, 2,
                 2, 9, 3, 3, 9, 4, 4, 9, 8, 9]

    trace = []
    for i in range(30):
        a_act = actions_a[i % len(actions_a)]
        b_act = actions_b[i % len(actions_b)]
        sim.step(a_act, b_act)
        snap = sim.get_state_snapshot()
        snap['action_a'] = a_act
        snap['action_b'] = b_act
        trace.append(snap)

    return trace


def test_movement_traces():
    """Walk into each wall, record final position. Must match JS."""
    speed = PLAYER_BASE_SPEED
    hw = PLAYER_WALL_HW
    results = []
    tests = [
        ('walk_right_into_wall', 936, 504, speed, 0, 200),
        ('walk_left_into_wall', 216, 504, -speed, 0, 200),
        ('walk_down_into_wall', 576, 504, 0, speed, 200),
        ('walk_up_into_wall', 576, 504, 0, -speed, 200),
    ]
    for label, sx, sy, vx, vy, frames in tests:
        x, y = float(sx), float(sy)
        for _ in range(frames):
            if position_clear(x + vx, y, hw):
                x += vx
            if position_clear(x, y + vy, hw):
                y += vy
        results.append({
            'label': label,
            'final_x': round(x, 2),
            'final_y': round(y, 2),
        })
        print(f"  {label}: final=({x:.2f}, {y:.2f})")
    return results


def test_bullet_travel():
    """Shoot bullets from center, count frames to wall hit. Must match JS."""
    results = []
    tests = [
        ('bullet_right_from_center', 576, 480, BULLET_SPEED, 0),
        ('bullet_down_from_center', 576, 480, 0, BULLET_SPEED),
    ]
    for label, sx, sy, bvx, bvy in tests:
        bx, by = float(sx), float(sy)
        lifetime = 0
        for _ in range(200):
            bx += bvx
            by += bvy
            lifetime += 1
            col = math.floor(bx / TILE)
            row = math.floor(by / TILE)
            if is_solid(col, row):
                break
        results.append({
            'label': label,
            'lifetime': lifetime,
            'final_x': round(bx, 1),
            'final_y': round(by, 1),
        })
        print(f"  {label}: hit wall at frame {lifetime}, pos=({bx:.1f}, {by:.1f})")
    return results


def test_freeze_math():
    """Verify CT-X stat conversion matches JS."""
    results = []
    # 50pts freeze
    fp50 = 0.90 - 50 * 0.009
    results.append({'label': '50pts_freeze_penalty', 'value': round(fp50, 4), 'expected': 0.45})
    # Frozen speed
    frozen = PLAYER_BASE_SPEED * (1 - fp50)
    results.append({'label': '50pts_frozen_speed', 'value': round(frozen, 4), 'expected': 4.125})
    # Fire rate 50pts
    p = min(100, 50 * 1.2)
    fr = 11.025 - p * 0.1125 if p <= 50 else 5.4 - (p - 50) * 0.0375
    cd = round(fr * 4)
    results.append({'label': '50pts_shoot_cd', 'value': cd, 'expected': 20})

    for r in results:
        r['pass'] = abs(r['value'] - r['expected']) < 0.001 if isinstance(r['expected'], float) else r['value'] == r['expected']
        status = 'OK' if r['pass'] else 'FAIL'
        print(f"  {r['label']}: {r['value']} (expected {r['expected']}) [{status}]")
    return results


def run_all():
    results = {
        'collision_grid': test_collision_grid(),
        'position_clear': test_position_clear(),
        'bullet_hit': test_bullet_hit(),
        'deterministic_trace': test_deterministic_match(),
    }

    # Summary of unit tests
    total = 0
    passed = 0
    for category in ['collision_grid', 'position_clear', 'bullet_hit']:
        for r in results[category]:
            total += 1
            if r['pass']:
                passed += 1
            else:
                print(f"FAIL: {r.get('label', r['test'])} — expected {r['expected']}, got {r['actual']}")

    print(f"\nUnit tests: {passed}/{total} passed")

    # Movement traces (compare output with JS console)
    print("\n--- Movement Traces (compare with JS) ---")
    results['movement_traces'] = test_movement_traces()

    # Bullet travel (compare with JS console)
    print("\n--- Bullet Travel (compare with JS) ---")
    results['bullet_travel'] = test_bullet_travel()

    # Freeze math
    print("\n--- Freeze/Gun Math ---")
    freeze_results = test_freeze_math()
    results['freeze_math'] = freeze_results
    for r in freeze_results:
        total += 1
        if r['pass']:
            passed += 1

    print(f"\nTotal validated: {passed}/{total} passed")
    print(f"Deterministic trace: {len(results['deterministic_trace'])} frames recorded")

    # Export for JS validation
    with open('test_cases.json', 'w') as f:
        json.dump(results, f, indent=2)
    print("Wrote test_cases.json — load in browser to validate against JS engine")

    return results


if __name__ == '__main__':
    run_all()
