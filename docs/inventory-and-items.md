# Inventory & Items

## Overview

The inventory system manages a 100-slot item bag, 4 equipment slots, and session-scoped dungeon shop gear. Items follow a uniform structure with 6 types. Armor is roguelike -- purchased from shops during dungeon runs and lost on exit. The interactable system connects NPCs and shop stations to the UI panel manager, and the shop framework provides reusable drawing and click helpers for all vendor panels.

## Files

- `js/authority/inventorySystem.js` -- Core inventory logic, equipment, item creation, armor stat functions, default weapons
- `js/shared/itemData.js` -- `ITEM_CATEGORIES`, `PALETTE`, `ITEM_STAT_RENDERERS`, tier helpers
- `js/shared/armorVisuals.js` -- `ARMOR_VISUALS` tier color palettes and glow animation config
- `js/core/interactable.js` -- Interactable registration, NPC definitions, default weapons, armor/weapon tier data, armor stat functions
- `js/client/ui/shopFramework.js` -- Reusable shop panel drawing and click helpers

## Key Functions & Globals

### Inventory Management (`inventorySystem.js`)

| Function / Constant | Purpose |
|---|---|
| `MAX_INVENTORY_SLOTS` | Constant: `100` |
| `addToInventory(item)` | Adds item; stacks if `stackable`, returns `false` if full |
| `removeFromInventory(slot)` | Splices and returns the item at the given index |
| `isInInventory(id)` | Returns `true` if any slot contains an item with matching `id` |
| `findInventoryItemById(id)` | Returns the item object or `null` |
| `createItem(type, tierData)` | Creates a non-stackable item from tier data |
| `createConsumable(id, name, count)` | Creates a stackable consumable item |
| `equipItem(slot)` | Equips item from inventory slot; toggling (re-equip = unequip) |
| `unequipItem(eqType)` | Moves equipped item back to inventory, reverts to defaults |

### Equipment (`inventorySystem.js`)

| Function | Purpose |
|---|---|
| `applyGunStats(data)` | Sets `playerEquip.gun` and updates `gun.*` fields |
| `applyMeleeStats(data)` | Sets `playerEquip.melee` and updates `melee.*` fields |
| `applyDefaultGun()` | Reverts to the starter Pistol |
| `applyDefaultMelee()` | Reverts to the starter Knife |

### Armor Stat Functions (`interactable.js`)

| Function | Returns |
|---|---|
| `getArmorReduction()` | Combined damage reduction from pants + chest (capped at 50%) |
| `getArmorHPBonus()` | HP bonus from chest armor |
| `getBootsSpeedBonus()` | Speed bonus from boots |
| `getDodgeChance()` | Dodge chance from boots |
| `getPoisonReduction()` | Poison resist from helmet |
| `getStatusReduction()` | Status effect resist from helmet |
| `getAbsorb()` | Absorb percentage from helmet (T4: 10% damage -> heal) |
| `getProjReduction()` | Projectile/AOE damage reduction from pants |
| `getThorns()` | Thorns damage reflect percentage from pants |
| `getStagger()` | Stagger chance from pants |
| `getHealBoost()` | Heal effectiveness boost from chest |
| `getChestRegen()` | HP regen per second from chest |
| `hasRevive()` | Whether chest has auto-revive (T4) |
| `getArmorSetTier()` | Minimum tier across all 4 equipped slots (0 if any empty) |
| `recalcMaxHp()` | Recalculates `player.maxHp` from floor base HP + chest bonus |
| `checkPlayerDeath()` | Handles death with auto-revive check |

### Item Data (`itemData.js`)

| Item | Purpose |
|---|---|
| `ITEM_CATEGORIES` | `{ equipment: [...], armor: [...], weapons: [...] }` |
| `PALETTE` | Centralized UI colors: accent, panelBg, panelBorder, gold, tierColors, tierNames |
| `ITEM_STAT_RENDERERS` | Per-type stat display functions: gun, melee, boots, pants, chest, helmet |
| `getTierColor(tier)` | Returns hex color from `PALETTE.tierColors` |
| `getTierName(tier)` | Returns name from `PALETTE.tierNames` |

### Shop Framework (`shopFramework.js`)

| Function | Purpose |
|---|---|
| `shopDrawPanel(pw, ph, opts)` | Draws centered modal with dimmed backdrop; returns `{px, py, pw, ph}` |
| `shopDrawHeader(px, py, pw, title, opts)` | Draws header bar with title, gold display, close button |
| `shopDrawTabs(px, py, pw, tabs, activeIdx, opts)` | Draws horizontal tab bar; returns tab rects |
| `shopDrawItemRow(px, py, pw, rowH, item, opts)` | Draws a single list-style item row; returns rect |
| `shopDrawItemGrid(px, py, pw, items, opts)` | Draws a card grid; returns array of rects with indices |
| `shopHitTest(mx, my, rect)` | Point-in-rect check |
| `shopTabHitTest(mx, my, tabRects)` | Returns clicked tab index or -1 |
| `shopItemHitTest(mx, my, itemRects)` | Returns clicked item index or -1 |
| `shopBuy(cost, onSuccess)` | Deducts gold and calls callback; returns false with hit effect if insufficient |
| `shopDrawEmpty(cx, cy, text)` | Draws centered placeholder text |

## How It Works

### Item Format

Every item in the inventory follows this structure:

```js
{
  id: 'storm_ar',        // unique identifier
  name: 'Storm AR Lv.5', // display name
  type: 'gun',           // one of: gun, melee, armor, consumable, material, key
  tier: 0,               // numeric tier (0-4 for progression items)
  data: { ... },         // type-specific stats (damage, fireRate, etc.)
  stackable: false,      // true for consumables and materials
  count: 1,              // stack count (only meaningful if stackable)
}
```

### Item Types

| Type | Stackable | Equipment Slot | Notes |
|---|---|---|---|
| `gun` | No | weapon | Ranged weapon with damage, fireRate, magSize |
| `melee` | No | melee | Melee weapon with damage, range, cooldown, critChance |
| `boots` / `pants` / `chest` / `helmet` | No | armor (4 slots) | Armor with defensive stats |
| `consumable` | Yes | -- | Potions, food |
| `material` | Yes | -- | Ores, weapon parts, crafting ingredients |
| `key` | No | -- | Dungeon keys, quest items |

### Equipment Slots

```
EQUIP_SLOTS = ['weapon', 'melee', 'armor', 'accessory']
```

The `playerEquip` object holds the currently equipped item data for each slot. Equipping from inventory applies stats immediately via `applyGunStats()` / `applyMeleeStats()`. Re-equipping the same item toggles it off (reverts to default weapon).

### Armor Tiers (Session-Scoped, Roguelike)

Armor is purchased from the dungeon shop during a run. All armor resets when leaving the dungeon. Each armor piece type has 4 tiers, wave-gated by the player's global wave count:

**Boots** (`BOOTS_TIERS`):

| Tier | Name | Cost | Speed | Dodge | Special |
|---|---|---|---|---|---|
| 1 | Leather Boots | 15g | +0.7 | -- | -- |
| 2 | Swift Boots | 60g | +1.9 | 15% | -- |
| 3 | Shadow Boots | 280g | +2.3 | 20% | Shadow Step (crit after dodge) |
| 4 | Phantom Boots | 550g | +2.6 | 25% | Phase Through (ignore mob collision) |

**Pants** (`PANTS_TIERS`):

| Tier | Name | Cost | Dmg Reduce | Proj Reduce | Special |
|---|---|---|---|---|---|
| 1 | Padded Pants | 20g | 10% | -- | -- |
| 2 | Chain Leggings | 70g | 20% | 30% | -- |
| 3 | Plate Greaves | 320g | 25% | 35% | Thorns 25% |
| 4 | Titan Guards | 620g | 30% | 50% | Thorns 40% + Stagger 30% |

**Chest** (`CHEST_TIERS`):

| Tier | Name | Cost | HP Bonus | Dmg Reduce | Special |
|---|---|---|---|---|---|
| 1 | Chain Mail | 25g | +25 | 5% | -- |
| 2 | Plate Armor | 90g | +100 | 10% | +15% heals |
| 3 | Dragon Plate | 400g | +150 | 15% | Regen 1.5 HP/s |
| 4 | Eternal Aegis | 800g | +200 | 20% | Auto-Revive (once per run) |

**Helmet** (`HELMET_TIERS`):

| Tier | Name | Cost | Poison Resist | Status Resist | Special |
|---|---|---|---|---|---|
| 1 | Leather Cap | 20g | 50% | 15% | -- |
| 2 | Iron Helm | 75g | 75% | 35% | -- |
| 3 | Warden Helm | 340g | 85% | 55% | -- |
| 4 | Void Crown | 700g | 100% | 80% | Absorb 10% damage as heal |

**Session guns** (also wave-gated, not part of progression):

| Tier | Name | Cost | Damage | Fire Rate | Special |
|---|---|---|---|---|---|
| 1 | SMG | 40g | 38 | 3 | -- |
| 2 | Rifle | 120g | 92 | 6 | -- |
| 3 | Frost Rifle | 480g | 122 | 4 | Frost Slow + Frost Nova |
| 4 | Inferno Cannon | 900g | 169 | 3 | Burn DOT + Chain Explosions |

**Session melee** (also wave-gated):

| Tier | Name | Cost | Damage | Range | Special |
|---|---|---|---|---|---|
| 1 | Sword | 30g | 30 | 120 | -- |
| 2 | Ninja Katanas | 100g | 53 | 130 | 3x dash, 30% crit |
| 3 | Storm Blade | 440g | 145 | 135 | Shockwave + Chain Lightning + Lifesteal |
| 4 | War Cleaver | 850g | 175 | 150 | Cleave All + Piercing Blood + 50% crit |

### Armor Visuals (`armorVisuals.js`)

`ARMOR_VISUALS` maps each armor tier (1-4) to color palettes for rendering:

| Tier | Theme | Glow |
|---|---|---|
| 1 | Leather | None |
| 2 | Iron / Chainmail | None |
| 3 | Warden / Plate | Ember glow (pulsing orange, `animSpeed: 0.005`) |
| 4 | Void | Void glow (pulsing purple, `animSpeed: 0.006`) |

`tierGlow(tier, time)` returns the animated alpha for tiers 3-4 (0 for tiers without glow).

### ITEM_CATEGORIES

```js
ITEM_CATEGORIES = {
  equipment: ['gun', 'melee', 'boots', 'pants', 'chest', 'helmet'],
  armor:     ['boots', 'pants', 'chest', 'helmet'],
  weapons:   ['gun', 'melee'],
}
```

Used by `equipItem()` to check if an item type can be equipped.

### PALETTE

Centralized UI color constants:

```js
PALETTE = {
  accent: "#5fca80",           // Main UI green
  panelBg: "#0c1018",          // Dark panel backgrounds
  panelBorder: "#2a6a4a",      // Green panel borders
  headerBg: "rgba(30,60,45,0.5)",
  closeBtn: "#c33",            // Close/cancel button red
  gold: "#ffd740",             // Gold/currency text
  tierColors: ['#888', '#5fca80', '#4a9eff', '#ff9a40', '#ff4a8a'],
  tierNames: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
}
```

### ITEM_STAT_RENDERERS

Registry mapping item types to stat display functions. Each renderer receives the item `data` and a `drawStat(label, value, color)` callback:

| Type | Stats Displayed |
|---|---|
| `gun` | Damage, Pellets, Fire Rate, Mag Size, Pierce, Spread, Range, Special |
| `melee` | Damage, Crit Chance, Range, Cooldown, Special |
| `boots` | Speed, Dodge, Special |
| `pants` | Dmg Reduce, Proj Reduce, Thorns, Stagger |
| `chest` | Max HP, Dmg Reduce, Heal Boost, Regen, Special |
| `helmet` | Poison Resist, Status Resist, Absorb |

### Interactable System

The interactable system manages proximity-based E-key interactions:

```js
registerInteractable({
  id: 'shop_station',
  x: ..., y: ...,       // position (can be getter)
  range: 220,            // activation distance
  label: '[E] Shop',     // prompt text
  type: 'shop',
  canInteract() { ... }, // visibility/availability check
  onInteract() { ... },  // action on E press
});
```

**Registered interactables**:

| ID | Location | Opens |
|---|---|---|
| `shop_station` | Dungeon floors (between waves) | Shop panel |
| `fish_vendor` | Lobby (near dock) | Fish Vendor panel |
| `farm_vendor` | Farm/house | Farm Shop panel |
| `gunsmith_npc` | Gunsmith room | Gunsmith panel |
| `mining_npc` | Mine rooms | Mining Shop panel |

`getNearestInteractable()` finds the closest valid interactable within range. The input system checks this each frame to show the E prompt and handle interaction.

### Shop Framework

The shop framework provides reusable Canvas drawing helpers so new vendor panels avoid duplicating layout code:

1. **`shopDrawPanel()`** -- Draws the modal backdrop and panel border, returns coordinates for child layout
2. **`shopDrawHeader()`** -- Draws the title bar with gold display and close button, returns close button rect
3. **`shopDrawTabs()`** -- Draws horizontal tab buttons, returns rects for click detection
4. **`shopDrawItemRow()`** -- Draws a single item in list layout (name, desc, price/status)
5. **`shopDrawItemGrid()`** -- Draws items as a card grid with tier bars, buy buttons
6. **`shopBuy(cost, onSuccess)`** -- Gold check + deduction + success callback

All drawing uses `ctx` (global Canvas 2D context) and `PALETTE` colors. Hit testing uses `shopHitTest(mx, my, rect)`.

## Connections to Other Systems

- **Progression System** (`progressionData.js`) -- Main guns and pickaxes in the inventory use PROG_ITEMS for stat calculation; `createMainGun()` calls `getProgressedStats()`
- **Wave System** (`waveSystem.js`) -- Gold earned from mob kills funds shop purchases; armor tier wave-gates check against global wave count
- **Save/Load** (`saveLoad.js`) -- Inventory contents, equipment state, and gun progress are persisted in localStorage
- **Combat System** (`combatSystem.js`) -- Equipped weapon stats feed into damage calculations; armor stats affect damage taken
- **UI Panel Manager** (`panels.js`) -- Shop, gunsmith, and vendor UIs are opened via `UI.open()` from interactable callbacks
- **Character Rendering** (`characterSprite.js`) -- Reads `playerEquip` to draw equipped armor using `ARMOR_VISUALS` colors

## Party Member Equipment

When the party system is active (`PartySystem`), bot members need independent equipment state:

- Each bot has its own gun, melee, and armor stats -- they do not share the player's `playerEquip`.
- When the player purchases equipment from the dungeon shop, bot members must also receive equivalent gear via the equip sync mechanism.
- Bot equipment uses default weapons at party init, not copies of the player's current gun (copying the player's leveled gun makes bots overpowered).
- Bot fire rate and melee cooldown should use their own weapon stats, not hardcoded values.

## Gotchas & Rules

- **Armor is session-scoped**: All dungeon shop gear (boots, pants, chest, helmet, session guns, session melee) resets when leaving the dungeon. This is intentional roguelike design.
- **Damage reduction caps at 50%**: `getArmorReduction()` sums pants + chest and clamps to 0.50.
- **Auto-revive is once per dungeon run**: `reviveUsed` flag prevents multiple revives from Eternal Aegis.
- **Max HP scales with floor**: Base HP is 100/125/150/200/250 for floors 1-5. `recalcMaxHp()` must be called whenever chest armor changes.
- **Stacking behavior**: Only `consumable` and `material` items stack. Weapons, armor, and keys always occupy individual slots.
- **`equipItem()` toggles**: Calling `equipItem()` on an already-equipped item unequips it and reverts to default weapon. This is the intended UX.
- **Default weapons cannot be unequipped**: `unequipItem()` returns `false` for the starter Pistol and Knife.
- **Shop availability**: The dungeon shop station only activates when `Scene.inDungeon && waveState !== 'active'`. Other vendors check their respective scene states.
- **`ITEM_STAT_RENDERERS` is extensible**: Adding a new armor slot type means adding a new renderer entry here.
- **Shop framework is opt-in**: Existing shop panels can migrate incrementally to use `shopDraw*` helpers. No changes required until they choose to adopt.
