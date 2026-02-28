# Teah Online - Dev Log

> **How to use**: Before starting a Claude session, Claude reads this file to know what everyone's been working on. At the end of each session, Claude adds a summary here. Always `git pull` before starting work so you have the latest.

---

## 2026-02-28 — Jeff (Claude session)

### 5 Main Guns + Gunsmith System (Full Implementation)
Added 5 permanent-progression guns bought from a Gunsmith NPC, leveled 1-25:

**Guns:**
- **Storm AR** — fast full-auto, light blue bullets, 200g
- **Heavy AR** — slow hard-hitting single shots, orange bullets, 300g
- **Boomstick** — shotgun, 3-5 pellets in spread cone, limited range (~200px), yellow bullets, 350g
- **Ironwood Bow** — slow charge, arrows pierce through mobs, no reload, brown arrows, 400g
- **Volt-9** — SMG bullet hose, very fast fire rate, random spread, purple bullets, 250g

**New mechanics added:**
- Shotgun pellet spread (gunSystem.js) — fires N bullets in a cone, pellets despawn after maxRange
- Arrow pierce (meleeSystem.js) — bullets pass through mobs, track hitMobs set, decrement pierceCount
- SMG random spread (gunSystem.js) — angular offset per shot
- Bow auto-charge (gunSystem.js) — neverReload flag, custom bulletSpeed

**Gunsmith room (gunsmith_01):**
- 44x30 tile workshop room accessible from lobby (door near right side)
- Contains: Gunsmith NPC, 2 workbenches, 2 weapon racks, anvil, 8 crates, 5 barrels, 8 torches
- Walk up to NPC, press E to open Gunsmith panel

**Gunsmith panel UI (panels.js):**
- Shows all 5 guns in a list with stats
- Click gun to see detailed stats, level, upgrade costs
- BUY button for unowned guns (deducts gold)
- UPGRADE button (gold-only for testing — materials noted for future)
- Stat comparison (current vs next level) with green diff indicators

**Upgrade system:**
- Linear interpolation: stat(level) = base + (max - base) * (level - 1) / 24
- Gold-only upgrades work now for testing
- GUN_UPGRADE_RECIPES defined per level with gold + ore + weapon parts (parts not yet droppable)
- 4 placeholder material items: common/uncommon/rare/epic weapon parts

**Save/Load:**
- Gun levels persist in localStorage under `window._gunLevels`
- Level 0 = not owned, 1-25 = owned at that level

**Files created:**
- `js/shared/gunData.js` — gun definitions, stat formulas, upgrade recipes

**Files modified:**
- `js/core/gunSystem.js` — pellet spawning, SMG spread, bow no-reload, custom bullet speed
- `js/core/meleeSystem.js` — pierce mechanic, max-range despawn
- `js/client/rendering/characterSprite.js` — 5 new gun visuals + drawBow()
- `js/client/rendering/entityRenderers.js` — building_gunsmith, gunsmith_npc, workbench, weapon_rack, anvil, crate, barrel renderers
- `js/authority/inventorySystem.js` — extended applyGunStats(), createMainGun()
- `js/shared/itemData.js` — gun stat renderer for new fields
- `js/shared/levelData.js` — gunsmith_01 room + lobby building_gunsmith entity
- `js/core/sceneManager.js` — gunsmith scene transitions
- `js/core/interactable.js` — gunsmith NPC interactable
- `js/client/ui/panels.js` — gunsmith panel UI + upgrade click handler
- `js/core/saveLoad.js` — gun level persistence
- `index.html` — new script tag + cache bumps

### Game Loop Fix (60 FPS lock)
- **Bug**: Old game loop had `if (updates === 0)` fallback that forced a physics tick every frame. On 120Hz+ monitors, lightweight scenes (gunsmith) ran physics at 120+ ticks/sec while heavy scenes (lobby) ran at ~60.
- **Fix**: Removed the fallback. Physics runs strictly at 60Hz via accumulator. Rendering only happens when physics updates (`if (updates > 0) draw()`). Everything locked to 60 FPS now.
- **File**: `js/core/draw.js`

---

## 2026-02-27 — Teeya (friend's commits)

### Deli Scene Overhaul
- Queue system: NPCs approach from side (not through line), order waits for customer at counter
- NPC browsing AI with emoji thought bubbles
- Diagonal aisle-to-queue route using L-shaped waypoints
- Multiple commits refining the deli NPC behavior

---
