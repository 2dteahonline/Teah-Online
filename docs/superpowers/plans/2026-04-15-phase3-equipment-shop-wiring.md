# Phase 3: Equipment + Shop + Inventory — Wiring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit 6 existing CODE-ONLY scripts against JS source, fix parity issues, and verify in Play mode.

**Architecture:** Scripts already exist and compile clean. GameBootstrap already creates all Phase 3 singletons (InventorySystem, ShopSystem, ShopStation, ShopPanelUI, InventoryPanelUI). The work is fixing specific parity bugs found during audit, adding missing integration calls, and Play-mode testing.

**Tech Stack:** Unity 6 (6000.4.0f1), C#, OnGUI panels, singleton managers

---

## Audit Summary

**Values verified correct (no changes needed):**
- ItemData.cs — All 24 tier entries match JS `interactable.js:192-227` exactly ✓
- ItemData.cs — All stat helper functions match JS ✓
- ItemData.cs — DEFAULT_GUN, DEFAULT_MELEE match JS `:160`, `:162` ✓
- ShopSystem.cs — All 6 buff definitions (name, baseCost, priceIncrease, maxBuy) match JS `:505-564` ✓
- InventorySystem.cs — AddItem, RemoveItem, CountMaterial, RemoveMaterial logic matches JS ✓
- InventorySystem.cs — EquipItem toggle-unequip + RecalcMaxHp matches JS `:236-268`, `:380-390` ✓
- ShopSystem.cs — GetBuffCost, IsUnlocked, IsOwned, BuyBuff, BuyEquipment logic matches JS ✓
- ShopStation.cs — Station config, spawn visuals, range check, animations match JS ✓
- InventoryPanelUI.cs — Layout, grid, equipment slots, input handling all look correct ✓

**Issues found (6 concrete fixes):**

| # | File | Issue | Severity |
|---|------|-------|----------|
| 1 | InventorySystem.cs:200 | `ApplyMeleeStats` missing `cs.meleeSpecial = data.special` — JS line 222 sets it | Critical — melee specials won't fire |
| 2 | CombatState.cs | Missing `gunSpecial` field — JS `gun.special` exists (line 134) | Critical — gun specials (frost/burn) need this for Phase 5 |
| 3 | InventorySystem.cs:182 | `ApplyGunStats` missing gun special assignment | Critical — same as #2 |
| 4 | WaveSystem.cs:97 | `StartDungeon` doesn't call `InventorySystem.ResetForDungeon()` or `ShopSystem.ResetForDungeon()` | Critical — equipment/buffs persist between dungeon runs |
| 5 | ShopPanelUI.cs:43 | `BUFF_MAX` array is `{99,99,99,99,99,99}` — should read actual maxBuy from ShopSystem.Buffs | Moderate — "MAXED" never shows for limited buffs |
| 6 | ShopPanelUI.cs:399-402 | `BuildStatDesc` shows wrong stats: Chest shows thorns (pants stat), Helmet shows healBoost/regen (chest stats) | Moderate — wrong stat text in shop |

---

### Task 1: Fix weapon special tracking

**Files:**
- Modify: `C:\Users\jeff\Desktop\Unity Proj\TeahOnline\Assets\Scripts\CombatState.cs:42`
- Modify: `C:\Users\jeff\Desktop\Unity Proj\TeahOnline\Assets\Scripts\InventorySystem.cs:182,200`

- [ ] **Step 1: Add `gunSpecial` field to CombatState**

After `meleeSpecial` (line 42), add:

```csharp
public string gunSpecial = null;                  // js/authority/inventorySystem.js:134
```

And in `ResetForDungeon()` (around line 124 where `meleeSpecial = null;`), add:

```csharp
gunSpecial = null;
```

And in `ResetForFloor()` (around line 158 where `meleeSpecial = null;`), add:

```csharp
gunSpecial = null;
```

- [ ] **Step 2: Set gun special in ApplyGunStats**

In `InventorySystem.cs`, after line 187 (`cs.gunReloading = false;`), add:

```csharp
cs.gunSpecial = data.special;                                          // :134 — frost, burn, etc.
```

- [ ] **Step 3: Set melee special in ApplyMeleeStats**

In `InventorySystem.cs`, after line 200 (`cs.meleeCritChance = ...`), add:

```csharp
cs.meleeSpecial = data.special;                                        // :222 — ninja, storm, cleave
```

- [ ] **Step 4: Verify via `read_console`**

Run `read_console` in Unity MCP to check 0 errors, 0 warnings after edits.

---

### Task 2: Fix dungeon reset integration

**Files:**
- Modify: `C:\Users\jeff\Desktop\Unity Proj\TeahOnline\Assets\Scripts\WaveSystem.cs:97`

- [ ] **Step 1: Add Phase 3 reset calls to StartDungeon**

In `WaveSystem.cs`, after line 97 (`CombatState.Instance?.ResetForDungeon();`), add:

```csharp
InventorySystem.Instance?.ResetForDungeon();                          // clear inventory + revert to default weapons
ShopSystem.Instance?.ResetForDungeon();                               // clear buff counters + reset lifesteal
```

- [ ] **Step 2: Verify via `read_console`**

Run `read_console` — expect 0 errors.

---

### Task 3: Fix ShopPanelUI parity issues

**Files:**
- Modify: `C:\Users\jeff\Desktop\Unity Proj\TeahOnline\Assets\Scripts\ShopPanelUI.cs:43,225,399-402`

- [ ] **Step 1: Remove hardcoded BUFF_MAX array**

Delete line 43:
```csharp
static readonly int[] BUFF_MAX = { 99, 99, 99, 99, 99, 99 };
```

- [ ] **Step 2: Fix DrawBuffsContent to read maxBuy from ShopSystem**

Replace line 225 (`bool maxed = timesBought >= BUFF_MAX[i];`) with:

```csharp
int maxBuy = ShopSystem.Instance.Buffs[i].maxBuy;
bool maxed = maxBuy > 0 && timesBought >= maxBuy;  // maxBuy 0 = unlimited
```

- [ ] **Step 3: Fix BuildStatDesc for Chest**

Replace the Chest case (line 399-400):
```csharp
case ItemData.ItemType.Chest:
    return "HP:+" + e.hpBonus + " THORNS:" + (e.thorns * 100f).ToString("F0") + "%";
```

With correct chest stats:
```csharp
case ItemData.ItemType.Chest:
    string chestDesc = "HP:+" + e.hpBonus + " DR:" + (e.dmgReduce * 100f).ToString("F0") + "%";
    if (e.healBoost > 0) chestDesc += " HEAL:+" + (e.healBoost * 100f).ToString("F0") + "%";
    if (e.regen > 0) chestDesc += " REGEN:" + e.regen.ToString("F1");
    if (e.revive) chestDesc += " REVIVE";
    return chestDesc;
```

- [ ] **Step 4: Fix BuildStatDesc for Helmet**

Replace the Helmet case (line 401-402):
```csharp
case ItemData.ItemType.Helmet:
    return "HEAL:+" + (e.healBoost * 100f).ToString("F0") + "% REGEN:" + e.regen.ToString("F1");
```

With correct helmet stats:
```csharp
case ItemData.ItemType.Helmet:
    string helmDesc = "POISON:-" + (e.poisonReduce * 100f).ToString("F0") + "% STATUS:-" + (e.statusReduce * 100f).ToString("F0") + "%";
    if (e.absorb > 0) helmDesc += " ABSORB:" + (e.absorb * 100f).ToString("F0") + "%";
    return helmDesc;
```

- [ ] **Step 5: Verify via `read_console`**

Run `read_console` — expect 0 errors.

---

### Task 4: Verify ShopStation Y-axis

**Files:**
- Read: `C:\Users\jeff\Desktop\Unity Proj\TeahOnline\Assets\Scripts\TileCollision.cs` (check coordinate system)
- Read: `C:\Users\jeff\Desktop\Unity Proj\TeahOnline\Assets\Scripts\EntitySpawner.cs` (check how other entities position)
- Possibly modify: `C:\Users\jeff\Desktop\Unity Proj\TeahOnline\Assets\Scripts\ShopStation.cs:59-61`

- [ ] **Step 1: Read TileCollision to understand coordinate system**

Check how `TileCollision` converts tile coordinates to world positions. Specifically:
- Does tile (0,0) map to bottom-left (Unity Y-up) or top-left (JS Y-down)?
- Is there a Y-flip in the tile-to-world conversion?

- [ ] **Step 2: Read EntitySpawner to see how other entities position**

Check how `EntitySpawner.SpawnEntities` converts entity tile positions to Unity world positions. This is the reference for how tile→world works in this project.

- [ ] **Step 3: Compare ShopStation positioning**

ShopStation.SpawnInDungeon currently does:
```csharp
float px = STATION_TX * TileCollision.TILE + TileCollision.TILE / 2f;
float py = STATION_TY * TileCollision.TILE + TileCollision.TILE / 2f;
```

If EntitySpawner applies a Y-flip and ShopStation doesn't, fix it to match. The Y-flip formula is typically:
```csharp
float py = (heightTiles - 1 - STATION_TY) * TileCollision.TILE + TileCollision.TILE / 2f;
```

But only apply this if EntitySpawner does the same. **Do not guess — read the code.**

- [ ] **Step 4: Fix if needed, then `read_console`**

---

### Task 5: Play-mode verification

**Files:** None (testing only)

- [ ] **Step 1: Enter Play mode**

Use `manage_editor(action="enter_play_mode")` to start Play mode.

- [ ] **Step 2: Test lobby → dungeon transition**

Walk to a dungeon portal and enter. Verify:
- Shop station crystal appears in the dungeon (bobbing animation)
- No console errors on transition

- [ ] **Step 3: Test shop interaction**

Between waves (after wave clears), walk to shop station and press E. Verify:
- "[E] Shop" prompt appears when near station
- Shop panel opens with 7 category tabs
- Buffs tab shows correct prices (Gun Damage +3 costs 15g first buy)
- Equipment tabs show tier items with correct stats
- "Wave N req" shows for locked items
- Buy a weapon — gold decreases, item equips, stats change

- [ ] **Step 4: Test inventory panel**

Press I to open inventory. Verify:
- Panel opens showing 5×4 grid
- Purchased items appear in grid
- Equipment slots show equipped items with tier colors
- Click equipment to equip, "Remove" to unequip
- Stats in CombatHUD update on equip/unequip
- Escape or I closes panel

- [ ] **Step 5: Test buff purchasing**

In shop Buffs tab:
- Buy "Gun Damage +3" — cost goes from 15 to 23 (15 + 1*8)
- Buy "Melee Speed +" 6 times — shows "MAXED" after 6
- Buy "Lifesteal +5" — verify counter increments

- [ ] **Step 6: Test dungeon reset**

Complete or die in dungeon, re-enter. Verify:
- Inventory is cleared
- Equipment reverts to default Sidearm + Combat Blade
- Buff counters reset to 0
- Gold persists (gold is NOT cleared by InventorySystem.ResetForDungeon — it's on CombatState)

- [ ] **Step 7: Fix any runtime issues**

If anything breaks in Play mode, fix it. Common issues:
- NullReferenceException on singleton access → check initialization order
- UI not appearing → check OnGUI is running (component enabled?)
- Position wrong → Y-axis conversion issue (see Task 4)

- [ ] **Step 8: `read_console` final check**

Verify 0 errors after all fixes.

---

### Task 6: Commit + push

- [ ] **Step 1: Increment GAME_UPDATE**

Read current value from `js/shared/gameConfig.js`, increment by 1.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "Phase 3 wiring: fix 6 parity issues, Play-mode verified equipment/shop/inventory"
git push
```

- [ ] **Step 3: Report update number**
