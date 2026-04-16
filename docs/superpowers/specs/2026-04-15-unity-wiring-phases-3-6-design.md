# Unity Wiring Pass: Phases 3-6 — Audit-Then-Wire Design

**Date:** 2026-04-15
**Scope:** Audit all CODE-ONLY scripts (Phases 3-6) against JS source, fix parity issues, wire to scene, Play-mode verify each phase sequentially.
**Approach:** Sequential phases, parallel audit WITHIN each phase (Approach C).

## Context

Phases 0-2 are wired and Play-mode verified (21 scripts). Phases 3-6 have ~66 scripts that compile clean but have never run. These scripts were written in bulk before the Phase 0-2 reboot and are likely to contain invented values, partial formula reads, and missing features (the 5 root cause patterns from `feedback_unity_port_root_causes.md`).

## Workflow Per Phase

Every phase follows the same cycle:

1. **Audit** — Dispatch parallel agents. Each agent reads 1-3 C# scripts + their JS counterparts. Checks every numeric value, formula, field name, and Y-axis conversion against JS with `js/file.js:line` citations. Flags parity issues.
2. **Fix** — Apply all corrections in one batch. Bottom-up edits in large files.
3. **Wire** — Add components to scene GameObjects, connect references, set up Canvas UI elements where needed.
4. **Play test** — Enter Play mode, exercise the phase's features, fix runtime errors.
5. **User verify** — User confirms in Play mode before moving to next phase.

## Phase Order & Dependencies

```
Phase 3: Equipment + Shop + Inventory + Basic Save
  ↓ (bots need equipment system to buy/equip)
Phase 4: Party + 3 AI Bots
  ↓ (abilities must target bots entity-agnostically)
Phase 5: 429 Mob Abilities + StatusFX + Telegraphs + Hazards + Weapon Specials
  ↓ (panels reference stats from all combat systems)
Phase 6: UI Panels + PanelManager + Casino + SaveLoad expanded
```

No skipping. Each phase ends with Play-mode verification.

---

## Phase 3: Equipment + Shop + Inventory (6 scripts)

### Scripts & JS Sources

| Script | JS Source(s) | Audit focus |
|--------|-------------|-------------|
| `InventorySystem.cs` | `js/authority/inventorySystem.js` | Slot count, drop logic, equip/unequip, category filtering |
| `ItemData.cs` | `js/shared/progressionData.js`, `js/shared/itemTypes.js` | All item definitions, tier stats, weapon damage/fire rate values |
| `ShopSystem.cs` | `js/authority/shopSystem.js` | Transaction logic, price formulas, gold deduction |
| `ShopStation.cs` | `js/core/interactables.js` | NPC interaction radius, shop trigger zones |
| `ShopPanelUI.cs` | `js/client/draw.js` (shop panel section) | Layout, tier browsing, buy button logic |
| `InventoryPanelUI.cs` | `js/client/draw.js` (inventory section) | Slot rendering, category tabs, equip interaction |

### Audit Agents (3)

- **Agent 3A:** `InventorySystem.cs` + `ItemData.cs` vs JS inventory + progression data
- **Agent 3B:** `ShopSystem.cs` + `ShopStation.cs` vs JS shop + interactables
- **Agent 3C:** `ShopPanelUI.cs` + `InventoryPanelUI.cs` vs JS draw.js panel sections

### Integration Points (grep across existing wired scripts)

- `CombatState` — equipment modifies armor, HP bonus, speed
- `DamageSystem` — equipment-modified damage calculation
- `CombatHUD` — show equipped weapon, gold count
- `GameSceneManager` — shop NPCs spawned per-level from entity data

### Wiring

- `InventorySystem` + `ShopSystem` → components on CombatManager runtime object (via GameBootstrap)
- `ShopStation` → spawned per-level from entity data (shop NPC entities)
- `ShopPanelUI` + `InventoryPanelUI` → Canvas children, input-triggered (Tab or key)
- Connect to `CombatState` for stat modifications
- Connect to `DamageSystem` for equipment-modified damage

### Play Test Exit Gate

- Earn gold in dungeon → walk to shop NPC → shop panel opens → buy T2 weapon → damage increases → open inventory → see item → equip/unequip → stats change in HUD → gold decreases correctly

---

## Phase 4: Party + 3 AI Bots (7 scripts)

### Scripts & JS Sources

| Script | JS Source(s) | Audit focus |
|--------|-------------|-------------|
| `PartySystem.cs` | `js/authority/partySystem.js` | MAX_SIZE=4, member management, heal-all-on-wave-clear, revive cost |
| `PartyMember.cs` | `js/authority/partySystem.js` | Per-member state: HP, gold, lives, equipment, death timers, AI state |
| `PartyData.cs` | `js/shared/partyData.js` | BOT_HP_MULT=3, bot presets, cosmetic data, revive costs |
| `BotController.cs` | `js/authority/botAI.js` | AABB movement, knockback, bot-to-bot separation, exact-overlap fix, body blocking |
| `BotAI.cs` | `js/authority/botAI.js` | FSM states (hunt/engage/flee/shop/roam), telegraph dodge, target selection, engagement range |
| `BotShopLogic.cs` | `js/authority/botAI.js` (shop section) | Purchase priority order, equipment application, buff buying |
| `PartyHUD.cs` | `js/client/draw.js` (party HUD section) | Bot HP bars, revive panel, spectate overlay, tier dots |

### Audit Agents (4)

- **Agent 4A:** `PartySystem.cs` + `PartyMember.cs` + `PartyData.cs` vs JS party system + data
- **Agent 4B:** `BotController.cs` vs JS botAI movement/collision sections
- **Agent 4C:** `BotAI.cs` + `BotShopLogic.cs` vs JS botAI FSM + shop sections
- **Agent 4D:** `PartyHUD.cs` vs JS draw.js party HUD section

### Integration Points (grep across ALL existing scripts)

- `DamageSystem` — bot damage routing, gold-by-ownerId, party lifesteal
- `MobManager` — `GetMobTarget()` returns nearest to ANY party member, contact damage for bots
- `WaveSystem` — mob count/HP scaling for party size, heal-all trigger, revive shop between waves
- `BulletManager` — ownerId field on bullets for gold routing
- `MeleeSystem` — `HitMobsInArc()` accessible to bots
- `CameraFollow` — spectate mode when player dead
- `GameSceneManager` — party init/reset/floor-advance hooks

### Wiring

- `PartySystem` → singleton on GameManager (via GameBootstrap)
- Bots → spawned as GameObjects with `BotController` + `SpriteRenderer` at dungeon entry
- `BotAI` → component on each bot, drives `BotController`
- `PartyHUD` → Canvas overlay showing bot status
- Spectate → switch `CameraFollow.target` to living bot on player death

### Play Test Exit Gate

- Enter dungeon → 3 bots spawn → bots fight mobs autonomously → bots take damage independently → bot dies → death animation → revive shop between waves → revive bot → complete dungeon → spectate works when player dies

---

## Phase 5: Mob Abilities + StatusFX + Telegraphs + Hazards + Weapon Specials (36 scripts)

### Core System Scripts (8)

| Script | JS Source(s) | Audit focus |
|--------|-------------|-------------|
| `MobAbilitySystem.cs` | `js/authority/combatSystem.js` | Ability lookup by mob type, cooldown timers, registration table |
| `MobAbilityContext.cs` | `js/authority/combatSystem.js` | Execution context: mob ref, target ref, elapsed time, phase |
| `AttackShapes.cs` | `js/authority/combatSystem.js` | Circle, rect, ray, cone hit detection — exact formulas |
| `TelegraphSystem.cs` | `js/client/draw.js` (telegraph section) | Circle/line/cone/ring/tile telegraph rendering, colors, durations |
| `HazardSystem.cs` | `js/authority/hazardSystem.js` | Ground hazard spawning, tick damage, duration, stacking rules |
| `StatusFX.cs` | `js/authority/statusFX.js` | All status types, duration, tick rates, damage formulas |
| `StatusFXRenderer.cs` | `js/client/draw.js` (status FX section) | Visual per status: stun ring, slow tint, mark crosshair, bleed drips, confuse swirl |
| `WeaponSpecials.cs` | `js/authority/weaponSpecials.js` | Ninja dash 3-chain, Storm Blade chain lightning, War Cleaver cleave+pierce |

### Dungeon Ability Scripts (28)

| Dungeon | Files | JS Source | Abilities |
|---------|-------|-----------|-----------|
| Azurine | `AzurineAbilities.cs` + `_A/_B/_C` (4) | `js/authority/azurineSpecials.js` | ~17 |
| Earth205 | `Earth205Abilities.cs` + `_A/_B/_C` (4) | `js/authority/earth205Specials.js` | ~96 |
| Earth216 | `Earth216Abilities.cs` + `_A/_B/_C` (4) | `js/authority/earth216Specials.js` | ~70 |
| Wagashi | `WagashiAbilities.cs` + `_A/_B/_C` (4) | `js/authority/wagashiSpecials*.js` (3 files) | ~246 |

**CRITICAL — Vortalis gap:** Vortalis dungeon abilities (~106) appear to be missing from the Unity scripts. The JS has `js/authority/vortalisSpecials.js`. Agent 5F is specifically assigned to verify this. If missing, these must be written from JS source during this phase — this could add 4+ new scripts and is the largest risk in the entire wiring pass.

### Audit Agents (6)

- **Agent 5A:** Core systems — `MobAbilitySystem.cs`, `MobAbilityContext.cs`, `AttackShapes.cs` vs JS combatSystem
- **Agent 5B:** Effects — `StatusFX.cs`, `StatusFXRenderer.cs`, `TelegraphSystem.cs`, `HazardSystem.cs` vs JS statusFX + draw.js + hazardSystem
- **Agent 5C:** `WeaponSpecials.cs` vs JS weaponSpecials
- **Agent 5D:** Azurine + Earth205 abilities (8 files) vs JS specials files
- **Agent 5E:** Earth216 + Wagashi abilities (8 files) vs JS specials files
- **Agent 5F:** Vortalis — audit whether scripts exist; if missing, write them from JS source

### Integration Points

- `MobInstance` — ability cooldowns, status effect state per mob
- `MobManager` — ability tick integration, hazard zone checks
- `PlayerController` / `BotController` — status effect application (stun stops movement, slow reduces speed)
- `DamageSystem` — status-modified damage (mark increases damage taken, bleed ticks)
- `GunSystem` / `MeleeSystem` — weapon special triggers

### Wiring

- `MobAbilitySystem` + `HazardSystem` + `TelegraphSystem` → singletons on GameManager
- `StatusFX` → integrated into `MobInstance`, `PlayerController`, `BotController` (tick every frame)
- `StatusFXRenderer` → visual layer reading StatusFX state from entities
- `WeaponSpecials` → hooks into `GunSystem`/`MeleeSystem` for special weapon types
- All ability files → registered into `MobAbilitySystem` lookup table at startup

### Play Test Exit Gate

- Enter each of 5 dungeons → mobs use abilities → telegraphs appear before attacks → hazard zones deal tick damage → status effects apply and render visually → weapon specials fire correctly → no console errors through floor 3+

---

## Phase 6: UI Panels + PanelManager + Casino + SaveLoad (17 scripts)

### Scripts & JS Sources

| Script | JS Source(s) | Audit focus |
|--------|-------------|-------------|
| `PanelManager.cs` | `js/client/draw.js` (panel orchestration) | Open/close logic, mutual exclusion, keybind mapping, escape-to-close |
| `SettingsPanelUI.cs` | `js/client/settingsPanel.js` | Keybind rebinding, toggles, sound sliders |
| `IdentityPanelUI.cs` | `js/client/draw.js` (identity section) | Name, faction, country, language, relationship |
| `StatsPanelUI.cs` | `js/client/draw.js` (stats section) | Skill XP, progression tier, kill counts |
| `GunsmithPanelUI.cs` | `js/client/draw.js` (gunsmith section) | Weapon stat details, upgrade paths |
| `MiningShopPanelUI.cs` | `js/client/draw.js` (mining shop) | Mining vendor items, prices, level requirements |
| `CustomizePanelUI.cs` | `js/client/draw.js` (customize section) | 19-color picker, head selection, preview |
| `ForgePanelUI.cs` | `js/client/draw.js` (forge section) | Crafting recipes, material requirements |
| `MinimapUI.cs` | `js/client/draw.js` (minimap section) | Fullscreen overlay, room labels, player dot |
| `ChatProfileUI.cs` | `js/client/draw.js` (chat profile) | Chat icon bubbles, profile popup |
| `TestMobPanelUI.cs` | `js/client/draw.js` (test mob) | Debug mob spawner, dungeon selector, mob type picker |
| `CasinoPanelUI.cs` | `js/authority/casinoSystem.js`, `js/client/draw.js` | Casino lobby, game selection, bet UI |
| `CasinoGames_A.cs` | `js/authority/casinoSystem.js` | First batch casino games — exact rules, odds, 5% house edge |
| `CasinoGames_B.cs` | `js/authority/casinoSystem.js` | Second batch — exact rules, payouts |
| `ToolboxUI.cs` | `js/client/draw.js` (toolbox section) | Debug commands panel |
| `ShopFramework.cs` | `js/client/draw.js` (shop framework) | Generic shop panel template |
| `SaveLoadSystem.cs` | `js/core/saveLoad.js` | Schema v10 fields, serialization, all persistent state |

### Audit Agents (5)

- **Agent 6A:** `PanelManager.cs` + `SettingsPanelUI.cs` + `ToolboxUI.cs` vs JS panel orchestration + settings
- **Agent 6B:** `IdentityPanelUI.cs` + `StatsPanelUI.cs` + `CustomizePanelUI.cs` + `ChatProfileUI.cs` vs JS draw.js sections
- **Agent 6C:** `GunsmithPanelUI.cs` + `MiningShopPanelUI.cs` + `ForgePanelUI.cs` + `ShopFramework.cs` vs JS draw.js + shop data
- **Agent 6D:** `CasinoPanelUI.cs` + `CasinoGames_A.cs` + `CasinoGames_B.cs` vs JS casinoSystem (exact odds, rules, payouts)
- **Agent 6E:** `MinimapUI.cs` + `TestMobPanelUI.cs` + `SaveLoadSystem.cs` vs JS draw.js + saveLoad.js

### Integration Points

- `PanelManager` reads input, manages which panel is open (mutual exclusion)
- All panels read state from existing systems (InventorySystem, CombatState, PartySystem, etc.)
- `SaveLoadSystem` must capture ALL persistent state: gold, inventory, equipment, cosmetics, settings, keybinds, progression, skill XP
- Casino games deduct/award gold through `InventorySystem` or equivalent
- `TestMobPanelUI` calls `MobManager` to spawn specific mobs

### Wiring

- `PanelManager` → singleton, Canvas parent for all panels
- Each panel → Canvas child, registered with PanelManager
- Keybinds → PanelManager listens for mapped keys (Tab=inventory, M=minimap, etc.)
- `SaveLoadSystem` → hooks into all systems with persistent state
- Casino → gold integration via inventory/shop system

### Play Test Exit Gate

- Every panel opens via keybind or button → correct data displayed → interactions work (buy, equip, customize, rebind keys) → panels close properly (Escape or toggle) → mutual exclusion works (only one panel at a time) → save game → reload → all state persists → casino games play with correct odds/payouts

---

## Risk Summary

| Phase | Scripts | Audit agents | Key risk |
|-------|---------|-------------|----------|
| 3 | 6 | 3 | Equipment stat formulas wrong, price values invented |
| 4 | 7 | 4 | Bot integration touches 6+ existing scripts, entity-agnostic violations |
| 5 | 36 | 6 | Sheer volume (429 abilities), possible missing Vortalis dungeon, Y-axis in attack shapes |
| 6 | 17 | 5 | SaveLoad must capture ALL state from all phases, casino odds must be exact |

**Total: ~66 scripts, ~18 audit agents dispatched across 4 sequential phases.**

## Audit Agent Prompt Template

Every audit agent receives:
1. The C# script path(s) to audit
2. The JS source file path(s) to compare against
3. The actual C# API signatures of scripts it depends on (from already-wired phases)
4. Checklist: values match JS? formulas complete? field names match consumers? Y-axis converted? no invented values?

Agents return: list of parity issues with `js/file.js:line` citations, suggested fixes, and confidence level.
