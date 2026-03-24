# Hotbar & Quickslot System

## Overview

The hotbar is a 5-slot weapon/item bar displayed on-screen. Slots 1-4 support **quickslot assignment** — the player can assign any inventory item to override a slot's default behavior. Slot 5 (Grab) is permanently locked and never assignable.

The system uses two separate state variables:
- `activeSlot` (0=gun, 1=melee) — controls weapon mode for combat, rendering, and mining. Deeply wired throughout the codebase.
- `activeHotbarSlot` (0-4) — controls which hotbar slot is visually highlighted. Can differ from `activeSlot` when quickslots remap weapons to non-default slots.

## Files

| File | Role |
|------|------|
| `js/client/ui/inventory.js` | Hotbar rendering (`drawHotbar()`), quickslot assignment prompt, slot activation logic, quickslot icons |
| `js/client/ui/panelManager.js` | Keyboard routing — maps keybinds to `InputIntent.slotNPressed` flags |
| `js/client/input/input.js` | Hotbar click handling (mousedown on slot areas) |
| `js/client/ui/settings.js` | `DEFAULT_KEYBINDS` and `keybinds` object (slot1-5 keys) |
| `js/authority/waveSystem.js` | Declares `activeSlot` and `activeHotbarSlot` globals |
| `js/authority/damageSystem.js` | `hotbarSlots` array (3 elements: gun, melee, potion) |
| `js/authority/stateReset.js` | Resets `activeSlot` and `activeHotbarSlot` on scene transitions |
| `js/core/saveLoad.js` | Persists `quickSlots` array to localStorage |
| `js/core/gunSystem.js` | Reads `activeSlot` to determine shoot vs meleeSwing vs usePotion |

## Hotbar Slots

| Index | Default Type | Default Key | Default Behavior | Quickslot Assignable |
|-------|-------------|-------------|------------------|---------------------|
| 0 | Gun | 1 | Switch to gun mode (`activeSlot = 0`) | Yes |
| 1 | Melee | 2 | Switch to melee mode (`activeSlot = 1`) | Yes |
| 2 | Potion | 3 | Instant-use potion (no mode change) | Yes |
| 3 | Item | 4 | Use extra slot item (`useExtraSlotItem()`) | Yes |
| 4 | Grab | 5 | Toggle grab mode (`tryGrab()`) | **No — permanently locked** |

## Quickslot System

### Data Structure

```js
let quickSlots = [null, null, null, null]; // slots 0-3 (hotbar slots 1-4)
// Each element: null (default behavior) or { id, name, equipType, color, cropId }
```

### Assignable `equipType` Values

| equipType | Activation Behavior | Changes activeSlot? | Changes activeHotbarSlot? |
|-----------|--------------------|--------------------|--------------------------|
| `'gun'` | Finds gun in inventory, calls `equipItem()`, sets gun mode | Yes (→ 0) | Yes |
| `'melee'` | Finds melee in inventory, calls `equipItem()`, sets melee mode | Yes (→ 1) | Yes |
| `'hoe'` | Sets `farmingState.equippedHoe`, melee mode | Yes (→ 1) | Yes |
| `'seed'` | Sets `farmingState.selectedSeed` | No | No |
| `'potion'` | Calls `usePotion()` instantly | No | No |
| `'bucket'` | Sets `farmingState.bucketOwned = true` | No | No |

**Key design rule**: Only weapon equips (gun/melee/hoe) change `activeHotbarSlot`. Instant-use items (potion/seed/bucket) fire immediately without changing the visual highlight, so the player's current weapon stays active.

### Assignment Flow

1. Player left-clicks an assignable item in the inventory panel
2. Assignment prompt appears with 4 buttons showing actual keybind labels
3. Player clicks a slot button → item is assigned to that quickslot
4. If the item was already in a different quickslot, the old slot is cleared (no duplicates)
5. Inventory auto-closes and quickslot auto-saves

**Right-click** on inventory items shows item details (card popup), NOT the assignment prompt.

### Stale Quickslot Cleanup

When a quickslot is activated (key pressed) and the referenced item is no longer in inventory:
- The quickslot is automatically cleared (`quickSlots[slot] = null`)
- Auto-save triggers to persist the cleanup
- The slot falls through to default behavior

## Hotbar Rendering

### Layout

- **5 slots**, each 64×64px with 6px gap
- Position: `gameSettings.hotbarPosition` — `"right"` (vertical) or `"bottom"` (horizontal center)

### Slot Visuals

Each slot renders based on its type and quickslot state:

**Gun slots** (default or `_qsGunOverride`):
- Pixel art icon for the specific gun ID (pistol, ct_x, rifle, smg, etc.)
- Tier color bar at top
- Tier label (T1, T2, etc.) at top-right
- Ammo count at bottom (only on `activeHotbarSlot`)
- Reload indicator when reloading

**Melee slots** (default or `_qsMeleeOverride`):
- Pixel art icon for specific melee ID (knife, sword, storm_blade, etc.)
- Unique icons for fishing rods (curved pole + reel + line) and pickaxes (handle + pointed head)
- Each rod/pickaxe tier has a unique color
- Tier color bar and label
- Cooldown overlay (only on `activeHotbarSlot`)
- [F] hint at top-right

**Potion slots** (default or quickslot):
- Bottle icon with fill level
- Count display (x3, etc.)
- Cooldown overlay

**Non-weapon quickslots**:
- Potion: full bottle art with count + cooldown
- Bucket: metal pail with handle and water line
- Seed: colored packet with seed dots
- Hoe: angled head on wooden handle
- Type badge circle (P/B/S/H) at top-right corner
- Item name at bottom

### Duplicate Prevention (Visual)

When an equipped weapon is assigned to a quickslot on a different slot, the default slot (0 for gun, 1 for melee) shows the fallback weapon icon (pistol/knife) instead of duplicating the weapon art.

### Badge Rules

- **Gun/melee quickslots**: No badge circle (weapon art + tier label is sufficient)
- **Non-weapon quickslots**: Colored badge circle with type letter at top-right

## Keyboard Routing

```
panelManager.js (keydown)
  → Checks keybinds.slot1/2/3/4 → sets InputIntent.slotNPressed
  → Also sets potionPressed if hotbarSlots[slot].type === "potion"
  → Block all slots in Mafia lobby

inventory.js (update tick)
  → Reads InputIntent.slot1-4Pressed
  → Checks quickSlots[slot] first
  → If quickslot: equip specific weapon or use item
  → If no quickslot: default behavior (gun/melee/potion/extraItem)
```

### Hotbar Click Routing (`input.js`)

Left-click on hotbar slots sets the same `InputIntent` flags as keyboard. Only `e.button === 0` (left-click) triggers inventory panel clicks — right-click shows item card popup via `contextmenu` handler.

## Save/Load

```js
// Save (saveLoad.js)
data.quickSlots = quickSlots; // 4-element array

// Load (backwards-compatible with old 3-slot saves)
for (let qi = 0; qi < 4; qi++) {
  quickSlots[qi] = data.quickSlots[qi] || null;
}
```

No schema version change — old saves with 3 quickslots load fine (4th slot defaults to null).

## Scene Transition Behavior

`resetCombatState()` in `stateReset.js` resets both:
```js
activeSlot = 0;
activeHotbarSlot = 0;
```

Other sync points:
- **Skeld**: `activeSlot = -1; activeHotbarSlot = -1;` (empty hands)
- **Hide & Seek**: Forces `activeSlot = 1; activeHotbarSlot = 1;` (melee only)
- **Spar**: Resets to `activeSlot = 0; activeHotbarSlot = 0;`
- **Snapshots**: Restores `activeSlot` from snapshot, syncs `activeHotbarSlot`

## Important Constants

| Constant | Location | Value | Purpose |
|----------|----------|-------|---------|
| `hotbarSlots` | `damageSystem.js` | 3-element array | Default slot types (gun/melee/potion). **Only 3 elements** — never access index 3+ |
| `HOTBAR_HOLD_THRESHOLD` | `inventory.js` | ~30 frames | Hold-to-inspect timer for weapon stats popup |
| `quickSlots` | `inventory.js` | 4-element array | Quickslot assignments |
| `activeSlot` | `waveSystem.js` | 0 or 1 | Weapon mode (gun/melee) |
| `activeHotbarSlot` | `waveSystem.js` | 0-4 | Visual highlight slot |

## Gotchas

- **`hotbarSlots` is only 3 elements** (indices 0-2). Always guard with `slot < hotbarSlots.length` before accessing.
- **`activeSlot` must stay 0 or 1** — it's read by gunSystem.js, miningSystem.js, characterSprite.js, and draw.js. Setting it to 2+ breaks combat.
- **Potion/seed/bucket are instant-use** — they must NOT change `activeHotbarSlot` or the player's weapon mode.
- **Right-click in inventory** shows item details, NOT quickslot assignment. Only left-click triggers assignment.
- **No duplicate items across quickslots** — assigning an item auto-clears it from any other slot.
- **Stale quickslots auto-clear** — if the referenced item is gone from inventory, the slot resets to null on next key press.
