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
    PLAYER_WALL_HW, BULLET_SPEED, ENTITY_R, PLAYER_HITBOX_Y,
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


def run_all():
    results = {
        'collision_grid': test_collision_grid(),
        'position_clear': test_position_clear(),
        'bullet_hit': test_bullet_hit(),
        'deterministic_trace': test_deterministic_match(),
    }

    # Summary
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
    print(f"Deterministic trace: {len(results['deterministic_trace'])} frames recorded")

    # Export for JS validation
    with open('test_cases.json', 'w') as f:
        json.dump(results, f, indent=2)
    print("Wrote test_cases.json — load in browser to validate against JS engine")

    return results


if __name__ == '__main__':
    run_all()
