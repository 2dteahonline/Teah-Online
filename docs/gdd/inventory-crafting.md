# Inventory, Crafting & Progression

## Source of truth

- `js/authority/inventorySystem.js` — slot-based inventory, item creation, equipment, stat application
- `js/authority/craftingSystem.js` — `CraftingSystem` upgrade/evolve authority (gold/material deduction, level/tier bumping)
- `js/shared/craftingData.js` — material registry, dungeon drop pools, per-mob drop tables, drop resolution
- `js/shared/progressionData.js` — `PROG_ITEMS` registry (5 tiers x 25 levels), stat interpolation, evolution costs, upgrade recipe generator
- `js/shared/oreData.js` — ore types, mine room pools, weighted ore picker

## Purpose

The inventory cluster owns how the player carries, stacks, equips, and transforms items. Inventory is a flat array of slots (max 200) holding equipment (gun/melee/armor/accessory) or stackable consumables/materials. Crafting drives the unified progression system: every main gun, fishing rod, and pickaxe scales over 5 tiers x 25 levels = 125 power steps via linear interpolation, fed by ores from mine rooms and weapon parts dropped by dungeon mobs and bosses.

## Values

### Inventory configuration

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| MAX_INVENTORY_SLOTS | 200 | slots | js/authority/inventorySystem.js:48 |
| EQUIP_SLOTS | `['weapon','melee','armor','accessory']` | array | js/authority/inventorySystem.js:19 |
| Item types | `gun, melee, armor, consumable, material, key` | enum | js/authority/inventorySystem.js:10 |
| Default stackable on createItem | false | bool | js/authority/inventorySystem.js:30 |
| Default count on createItem | 1 | count | js/authority/inventorySystem.js:31 |
| Default tier on createConsumable | 0 | tier | js/authority/inventorySystem.js:42 |
| Default count on createConsumable | 1 | count | js/authority/inventorySystem.js:44 |

### Item schema

| Field | Source | Notes | Citation |
|-------|--------|-------|----------|
| id | tierData.id / passed | string identifier | js/authority/inventorySystem.js:25 |
| name | tierData.name / passed | display name | js/authority/inventorySystem.js:26 |
| type | passed | one of item type enum | js/authority/inventorySystem.js:27 |
| tier | tierData.tier / 0 | numeric tier 0-4 | js/authority/inventorySystem.js:28 |
| data | tierData / stats | full stat object | js/authority/inventorySystem.js:29 |
| stackable | bool | true for consumables/materials | js/authority/inventorySystem.js:30 |
| count | int | stack count | js/authority/inventorySystem.js:31 |
| level | int | for progression items | js/authority/inventorySystem.js:161 |
| progItemId | string | marks progression item | js/authority/inventorySystem.js:162 |
| mainGunLevel | int | backward compat alias | js/authority/inventorySystem.js:166 |

### Stacking rules

| Rule | Value | Citation |
|------|-------|----------|
| Stackable items merge by id with existing matching stackable slot | true | js/authority/inventorySystem.js:52-58 |
| Non-stackable items consume one new slot | true | js/authority/inventorySystem.js:64 |
| Inventory full → push "INVENTORY FULL" hit effect, abort add | y-offset -40 | js/authority/inventorySystem.js:60-63 |
| Material removal walks slots back-to-front, splices empty stacks | — | js/authority/inventorySystem.js:113-123 |
| Ore lookups (id starts with `ore_`) fall through any item id when type filter zero | — | js/authority/inventorySystem.js:100-106 |

### Equipment & default-weapon rules

| Rule | Citation |
|------|----------|
| Re-equipping currently equipped item reverts to default for gun/melee, null for others | js/authority/inventorySystem.js:246-256 |
| Equipping non-equipment-category type silently no-ops | js/authority/inventorySystem.js:241-243 |
| Equip gun clamps `gun.ammo` to `gun.magSize` | js/authority/inventorySystem.js:261 |
| Equip chest triggers `recalcMaxHp()` | js/authority/inventorySystem.js:253, 266 |
| Cannot unequip default gun or default melee | js/authority/inventorySystem.js:275 |
| Unequip fails if inventory full | js/authority/inventorySystem.js:287 |

### applyGunStats defaults

| Field | Value | Citation |
|-------|-------|----------|
| gun.damage fallback | GUN_DEFAULTS.damage | js/authority/inventorySystem.js:130 |
| gun.magSize fallback | 12 | js/authority/inventorySystem.js:131 |
| gun.ammo when neverReload | Infinity | js/authority/inventorySystem.js:132 |
| gun.ammo otherwise | magSize or 12 | js/authority/inventorySystem.js:132 |
| gun.fireCooldownMax fallback | 10 | js/authority/inventorySystem.js:133 |
| gun.reloading reset | false | js/authority/inventorySystem.js:136 |
| gun.reloadTimer reset | 0 | js/authority/inventorySystem.js:137 |

### applyMeleeStats defaults

| Field | Value | Citation |
|-------|-------|----------|
| melee.damage fallback | MELEE_DEFAULTS.damage | js/authority/inventorySystem.js:218 |
| melee.range fallback | DEFAULT_MELEE.range | js/authority/inventorySystem.js:219 |
| melee.cooldownMax fallback | DEFAULT_MELEE.cooldown | js/authority/inventorySystem.js:220 |
| melee.critChance fallback | MELEE_DEFAULTS.critChance | js/authority/inventorySystem.js:221 |

## Progression system

### Configuration

| Name | Value | Citation |
|------|-------|----------|
| PROGRESSION_CONFIG.TIERS | 5 | js/shared/progressionData.js:11 |
| PROGRESSION_CONFIG.LEVELS_PER_TIER | 25 | js/shared/progressionData.js:12 |
| Total power steps (5 x 25) | 125 | js/shared/progressionData.js:2 |
| TIER_NAMES | `['Common','Uncommon','Rare','Epic','Legendary']` | js/shared/progressionData.js:13 |
| TIER_COLORS | `['#888','#5fca80','#4a9eff','#ff9a40','#ff4a8a']` | js/shared/progressionData.js:14 |
| Fractional stats (kept at 2 decimals) | `critChance, miningSpeed, fireRate, bulletSpeed, catchBonus` | js/shared/progressionData.js:407 |
| Interpolation parameter `t` | `(level - 1) / 24` | js/shared/progressionData.js:421 |

### PROG_ITEMS schema

Each entry defines:

| Field | Type | Citation |
|-------|------|----------|
| id | string | js/shared/progressionData.js:28 |
| name | string | js/shared/progressionData.js:29 |
| category | `main_gun \| fishing_rod \| pickaxe` | js/shared/progressionData.js:30 |
| type | `gun \| melee` (inventory item type) | js/shared/progressionData.js:31 |
| subtype | optional weapon class string | js/shared/progressionData.js:32 |
| desc | string | js/shared/progressionData.js:33 |
| buyPrice | gold | js/shared/progressionData.js:34 |
| bulletColor | `{main, core, glow}` | js/shared/progressionData.js:35 |
| flags | object (e.g. `pierce`, `isArrow`, `special`) | js/shared/progressionData.js:36, 123, 178 |
| color | hex (rods/picks) | js/shared/progressionData.js:177 |
| unlockGate | ore id (pickaxes) | js/shared/progressionData.js:255 |
| tiers | array length 5 of `{base:{...}, max:{...}}` | js/shared/progressionData.js:37-53 |

Within a tier, every numeric stat in `base`/`max` is linearly interpolated by level (L1 = base, L25 = max). Fractional stats keep 2 decimals; everything else is rounded to int (js/shared/progressionData.js:439-441).

Constraint: `tier[N+1].base >= tier[N].max` for ascending stats (damage, magSize), and the inverse for descending stats (fireRate, reloadSpeed, cooldown) (js/shared/progressionData.js:21-22).

### Registered PROG_ITEMS (13 total)

| ID | Name | Category | buyPrice | Citation |
|----|------|----------|---------:|----------|
| storm_ar | Storm AR | main_gun | 200 | js/shared/progressionData.js:27-54 |
| heavy_ar | Heavy AR | main_gun | 300 | js/shared/progressionData.js:56-83 |
| boomstick | Boomstick | main_gun | 350 | js/shared/progressionData.js:85-112 |
| ironwood_bow | Ironwood Bow | main_gun | 400 | js/shared/progressionData.js:114-141 |
| volt_9 | Volt-9 | main_gun | 250 | js/shared/progressionData.js:143-170 |
| bronze_rod | Bronze Rod | fishing_rod | 20 | js/shared/progressionData.js:175-191 |
| iron_rod | Iron Rod | fishing_rod | 80 | js/shared/progressionData.js:193-209 |
| gold_rod | Gold Rod | fishing_rod | 200 | js/shared/progressionData.js:211-227 |
| mythic_rod | Mythic Rod | fishing_rod | 500 | js/shared/progressionData.js:229-245 |
| pickaxe | Pickaxe | pickaxe | 0 | js/shared/progressionData.js:251-268 |
| copper_pickaxe | Copper Pickaxe | pickaxe | 50 | js/shared/progressionData.js:270-287 |
| iron_pickaxe | Iron Pickaxe | pickaxe | 80 | js/shared/progressionData.js:289-306 |
| gold_pickaxe | Gold Pickaxe | pickaxe | 150 | js/shared/progressionData.js:308-325 |
| amethyst_pickaxe | Amethyst Pickaxe | pickaxe | 250 | js/shared/progressionData.js:327-344 |
| ruby_pickaxe | Ruby Pickaxe | pickaxe | 400 | js/shared/progressionData.js:346-363 |
| diamond_pickaxe | Diamond Pickaxe | pickaxe | 600 | js/shared/progressionData.js:365-382 |
| emerald_pickaxe | Emerald Pickaxe | pickaxe | 900 | js/shared/progressionData.js:384-401 |

(13 entries above; comment header says "5 main guns + 4 rods + 8 pickaxes". The pickaxes section comments "8 pickaxes (1 per ore chain)" — js/shared/progressionData.js:248.)

### Tier boundaries — main guns (base@L1 / max@L25 per stat)

#### storm_ar (js/shared/progressionData.js:39-52)

| Tier | dmg base→max | fireRate base→max | mag base→max | reload base→max |
|-----:|-------------:|------------------:|-------------:|----------------:|
| 0 Common | 25 → 85 | 6 → 3 | 32 → 55 | 50 → 30 |
| 1 Uncommon | 88 → 150 | 3 → 2 | 56 → 72 | 29 → 22 |
| 2 Rare | 155 → 240 | 2 → 2 | 73 → 90 | 21 → 16 |
| 3 Epic | 248 → 360 | 2 → 1 | 91 → 110 | 15 → 12 |
| 4 Legendary | 372 → 500 | 1 → 1 | 112 → 130 | 11 → 8 |

#### heavy_ar (js/shared/progressionData.js:68-81)

| Tier | dmg | fireRate | mag | reload |
|-----:|----:|---------:|----:|-------:|
| 0 | 45 → 140 | 12 → 7 | 24 → 40 | 60 → 35 |
| 1 | 145 → 230 | 7 → 5 | 41 → 55 | 34 → 26 |
| 2 | 238 → 350 | 5 → 4 | 56 → 70 | 25 → 20 |
| 3 | 362 → 500 | 4 → 3 | 71 → 85 | 19 → 15 |
| 4 | 516 → 700 | 3 → 2 | 86 → 100 | 14 → 10 |

#### boomstick (js/shared/progressionData.js:97-110)

| Tier | dmg | fireRate | mag | reload | pellets | spread | maxRange |
|-----:|----:|---------:|----:|-------:|--------:|-------:|---------:|
| 0 | 18 → 45 | 20 → 14 | 6 → 12 | 70 → 45 | 3 → 5 | 15 → 12 | 200 → 200 |
| 1 | 47 → 75 | 14 → 11 | 13 → 18 | 44 → 35 | 5 → 6 | 12 → 10 | 220 → 220 |
| 2 | 78 → 120 | 11 → 9 | 19 → 24 | 34 → 28 | 6 → 7 | 10 → 8 | 240 → 240 |
| 3 | 124 → 180 | 9 → 7 | 25 → 30 | 27 → 22 | 7 → 8 | 8 → 6 | 260 → 260 |
| 4 | 186 → 260 | 7 → 5 | 31 → 36 | 21 → 16 | 8 → 10 | 6 → 5 | 280 → 280 |

#### ironwood_bow (js/shared/progressionData.js:126-139)

| Tier | dmg | fireRate | mag | reload | pierceCount |
|-----:|----:|---------:|----:|-------:|------------:|
| 0 | 60 → 200 | 18 → 10 | 12 → 20 | 90 → 50 | 1 → 3 |
| 1 | 206 → 340 | 10 → 7 | 21 → 28 | 49 → 38 | 3 → 4 |
| 2 | 351 → 500 | 7 → 5 | 29 → 35 | 37 → 28 | 4 → 5 |
| 3 | 516 → 700 | 5 → 4 | 36 → 42 | 27 → 20 | 5 → 6 |
| 4 | 722 → 950 | 4 → 3 | 43 → 50 | 19 → 14 | 6 → 8 |

Permanent flags: `pierce: true, isArrow: true` (js/shared/progressionData.js:123).

#### volt_9 (js/shared/progressionData.js:155-168)

| Tier | dmg | fireRate | mag | reload | spread |
|-----:|----:|---------:|----:|-------:|-------:|
| 0 | 12 → 35 | 3 → 2 | 50 → 80 | 55 → 30 | 8 → 5 |
| 1 | 36 → 58 | 2 → 2 | 82 → 110 | 29 → 22 | 5 → 4 |
| 2 | 60 → 90 | 2 → 1 | 112 → 140 | 21 → 16 | 4 → 3 |
| 3 | 93 → 135 | 1 → 1 | 142 → 170 | 15 → 12 | 3 → 2 |
| 4 | 140 → 200 | 1 → 1 | 172 → 200 | 11 → 8 | 2 → 1 |

### Tier boundaries — fishing rods

Stats: `durability, strength, catchBonus, damage, range, cooldown, critChance`.

#### bronze_rod (js/shared/progressionData.js:180-189)

| Tier | dur | str | catchBonus | dmg | range | cooldown | crit |
|-----:|----:|----:|-----------:|----:|------:|---------:|-----:|
| 0 | 25 → 50 | 1 → 2 | 0 → 0.08 | 8 → 16 | 80 → 85 | 34 → 28 | 0 → 0.04 |
| 1 | 52 → 80 | 2 → 3 | 0.09 → 0.18 | 17 → 28 | 86 → 92 | 27 → 22 | 0.05 → 0.08 |
| 2 | 83 → 120 | 3 → 4 | 0.19 → 0.30 | 29 → 44 | 93 → 100 | 21 → 18 | 0.09 → 0.12 |
| 3 | 124 → 170 | 4 → 5 | 0.31 → 0.44 | 46 → 64 | 101 → 110 | 17 → 14 | 0.13 → 0.16 |
| 4 | 175 → 240 | 5 → 7 | 0.46 → 0.60 | 66 → 90 | 112 → 120 | 13 → 10 | 0.17 → 0.22 |

#### iron_rod (js/shared/progressionData.js:198-207)

| Tier | dur | str | catchBonus | dmg | range | cooldown | crit |
|-----:|----:|----:|-----------:|----:|------:|---------:|-----:|
| 0 | 40 → 70 | 2 → 3 | 0.10 → 0.20 | 12 → 24 | 85 → 90 | 30 → 24 | 0.05 → 0.08 |
| 1 | 73 → 110 | 3 → 4 | 0.21 → 0.32 | 25 → 40 | 91 → 98 | 23 → 19 | 0.09 → 0.12 |
| 2 | 114 → 160 | 4 → 5 | 0.33 → 0.46 | 42 → 60 | 99 → 108 | 18 → 15 | 0.13 → 0.16 |
| 3 | 165 → 220 | 5 → 7 | 0.47 → 0.60 | 62 → 84 | 109 → 118 | 14 → 12 | 0.17 → 0.20 |
| 4 | 226 → 300 | 7 → 9 | 0.62 → 0.78 | 87 → 115 | 120 → 130 | 11 → 8 | 0.21 → 0.26 |

#### gold_rod (js/shared/progressionData.js:216-225)

| Tier | dur | str | catchBonus | dmg | range | cooldown | crit |
|-----:|----:|----:|-----------:|----:|------:|---------:|-----:|
| 0 | 60 → 100 | 3 → 4 | 0.20 → 0.34 | 16 → 32 | 90 → 96 | 26 → 20 | 0 → 0.12 |
| 1 | 104 → 150 | 4 → 5 | 0.35 → 0.48 | 34 → 52 | 97 → 106 | 19 → 16 | 0.13 → 0.16 |
| 2 | 155 → 210 | 5 → 7 | 0.50 → 0.64 | 54 → 76 | 107 → 116 | 15 → 12 | 0.17 → 0.20 |
| 3 | 216 → 280 | 7 → 9 | 0.66 → 0.80 | 78 → 104 | 118 → 128 | 11 → 9 | 0.21 → 0.25 |
| 4 | 288 → 380 | 9 → 12 | 0.82 → 1.00 | 108 → 145 | 130 → 142 | 8 → 6 | 0.26 → 0.32 |

#### mythic_rod (js/shared/progressionData.js:234-243)

| Tier | dur | str | catchBonus | dmg | range | cooldown | crit |
|-----:|----:|----:|-----------:|----:|------:|---------:|-----:|
| 0 | 100 → 160 | 5 → 6 | 0.35 → 0.50 | 22 → 44 | 95 → 102 | 22 → 17 | 0.12 → 0.16 |
| 1 | 165 → 230 | 6 → 8 | 0.52 → 0.66 | 46 → 70 | 103 → 112 | 16 → 13 | 0.17 → 0.20 |
| 2 | 236 → 310 | 8 → 10 | 0.68 → 0.82 | 72 → 100 | 114 → 124 | 12 → 10 | 0.21 → 0.25 |
| 3 | 318 → 400 | 10 → 13 | 0.84 → 1.00 | 104 → 140 | 126 → 138 | 9 → 7 | 0.26 → 0.30 |
| 4 | 410 → 520 | 13 → 16 | 1.00 → 1.20 | 145 → 200 | 140 → 155 | 6 → 4 | 0.31 → 0.38 |

### Tier boundaries — pickaxes

Stats: `damage, range, cooldown, critChance, miningSpeed`. Each pickaxe gates on an ore via `unlockGate`.

| ID | unlockGate | Citation |
|----|-----------|----------|
| pickaxe | null | js/shared/progressionData.js:255 |
| copper_pickaxe | coal | js/shared/progressionData.js:274 |
| iron_pickaxe | iron | js/shared/progressionData.js:293 |
| gold_pickaxe | gold | js/shared/progressionData.js:312 |
| amethyst_pickaxe | amethyst | js/shared/progressionData.js:331 |
| ruby_pickaxe | ruby | js/shared/progressionData.js:350 |
| diamond_pickaxe | diamond | js/shared/progressionData.js:369 |
| emerald_pickaxe | emerald | js/shared/progressionData.js:388 |

#### pickaxe (basic) (js/shared/progressionData.js:257-266)

| Tier | dmg | range | cd | crit | miningSpeed |
|-----:|----:|------:|---:|-----:|------------:|
| 0 | 10 → 18 | 70 → 74 | 32 → 28 | 0 → 0.03 | 1.0 → 1.2 |
| 1 | 19 → 30 | 75 → 80 | 27 → 22 | 0.04 → 0.07 | 1.22 → 1.5 |
| 2 | 31 → 46 | 81 → 86 | 21 → 18 | 0.08 → 0.11 | 1.52 → 1.8 |
| 3 | 48 → 66 | 87 → 92 | 17 → 14 | 0.12 → 0.16 | 1.82 → 2.2 |
| 4 | 68 → 90 | 93 → 100 | 13 → 10 | 0.17 → 0.22 | 2.24 → 2.8 |

#### copper_pickaxe (js/shared/progressionData.js:276-285)

| Tier | dmg | range | cd | crit | mining |
|-----:|----:|------:|---:|-----:|-------:|
| 0 | 14 → 24 | 70 → 75 | 30 → 26 | 0 → 0.04 | 1.15 → 1.35 |
| 1 | 25 → 38 | 76 → 82 | 25 → 20 | 0.05 → 0.08 | 1.37 → 1.65 |
| 2 | 39 → 56 | 83 → 89 | 19 → 16 | 0.09 → 0.12 | 1.68 → 2.0 |
| 3 | 58 → 78 | 90 → 96 | 15 → 12 | 0.13 → 0.17 | 2.04 → 2.4 |
| 4 | 80 → 105 | 97 → 105 | 11 → 8 | 0.18 → 0.24 | 2.44 → 3.0 |

#### iron_pickaxe (js/shared/progressionData.js:295-304)

| Tier | dmg | range | cd | crit | mining |
|-----:|----:|------:|---:|-----:|-------:|
| 0 | 18 → 30 | 70 → 76 | 28 → 24 | 0 → 0.04 | 1.3 → 1.52 |
| 1 | 31 → 46 | 77 → 84 | 23 → 18 | 0.05 → 0.08 | 1.54 → 1.85 |
| 2 | 48 → 66 | 85 → 92 | 17 → 14 | 0.09 → 0.12 | 1.88 → 2.2 |
| 3 | 68 → 92 | 93 → 100 | 13 → 10 | 0.13 → 0.17 | 2.24 → 2.6 |
| 4 | 95 → 125 | 101 → 110 | 9 → 7 | 0.18 → 0.24 | 2.65 → 3.2 |

#### gold_pickaxe (js/shared/progressionData.js:314-323)

| Tier | dmg | range | cd | crit | mining |
|-----:|----:|------:|---:|-----:|-------:|
| 0 | 22 → 36 | 75 → 80 | 26 → 22 | 0 → 0.05 | 1.5 → 1.72 |
| 1 | 37 → 54 | 81 → 88 | 21 → 16 | 0.06 → 0.09 | 1.75 → 2.08 |
| 2 | 56 → 78 | 89 → 96 | 15 → 12 | 0.10 → 0.14 | 2.12 → 2.5 |
| 3 | 80 → 106 | 97 → 105 | 11 → 9 | 0.15 → 0.19 | 2.54 → 2.95 |
| 4 | 110 → 145 | 106 → 115 | 8 → 6 | 0.20 → 0.26 | 3.0 → 3.6 |

#### amethyst_pickaxe (js/shared/progressionData.js:333-342)

| Tier | dmg | range | cd | crit | mining |
|-----:|----:|------:|---:|-----:|-------:|
| 0 | 26 → 42 | 75 → 82 | 24 → 20 | 0 → 0.05 | 1.7 → 1.95 |
| 1 | 43 → 62 | 83 → 90 | 19 → 15 | 0.06 → 0.10 | 1.98 → 2.32 |
| 2 | 64 → 88 | 91 → 99 | 14 → 11 | 0.11 → 0.15 | 2.36 → 2.75 |
| 3 | 90 → 120 | 100 → 108 | 10 → 8 | 0.16 → 0.21 | 2.8 → 3.25 |
| 4 | 124 → 165 | 110 → 120 | 7 → 5 | 0.22 → 0.28 | 3.3 → 4.0 |

#### ruby_pickaxe (js/shared/progressionData.js:352-361)

| Tier | dmg | range | cd | crit | mining |
|-----:|----:|------:|---:|-----:|-------:|
| 0 | 30 → 48 | 80 → 86 | 22 → 18 | 0 → 0.06 | 1.9 → 2.15 |
| 1 | 50 → 72 | 87 → 94 | 17 → 14 | 0.07 → 0.11 | 2.18 → 2.55 |
| 2 | 74 → 100 | 95 → 103 | 13 → 10 | 0.12 → 0.16 | 2.58 → 3.0 |
| 3 | 103 → 138 | 104 → 113 | 9 → 7 | 0.17 → 0.22 | 3.05 → 3.5 |
| 4 | 142 → 190 | 114 → 125 | 6 → 4 | 0.23 → 0.30 | 3.56 → 4.3 |

#### diamond_pickaxe (js/shared/progressionData.js:371-380)

| Tier | dmg | range | cd | crit | mining |
|-----:|----:|------:|---:|-----:|-------:|
| 0 | 35 → 55 | 80 → 88 | 20 → 16 | 0 → 0.06 | 2.1 → 2.4 |
| 1 | 57 → 82 | 89 → 97 | 15 → 12 | 0.07 → 0.11 | 2.44 → 2.85 |
| 2 | 84 → 115 | 98 → 107 | 11 → 9 | 0.12 → 0.16 | 2.9 → 3.35 |
| 3 | 118 → 156 | 108 → 118 | 8 → 6 | 0.17 → 0.23 | 3.4 → 3.9 |
| 4 | 160 → 215 | 119 → 130 | 5 → 3 | 0.24 → 0.32 | 3.96 → 4.8 |

#### emerald_pickaxe (js/shared/progressionData.js:390-399)

| Tier | dmg | range | cd | crit | mining |
|-----:|----:|------:|---:|-----:|-------:|
| 0 | 40 → 64 | 85 → 92 | 18 → 14 | 0 → 0.07 | 2.4 → 2.72 |
| 1 | 66 → 94 | 93 → 102 | 13 → 10 | 0.08 → 0.12 | 2.76 → 3.2 |
| 2 | 97 → 132 | 103 → 112 | 9 → 7 | 0.13 → 0.18 | 3.24 → 3.7 |
| 3 | 136 → 180 | 113 → 124 | 6 → 5 | 0.19 → 0.25 | 3.76 → 4.3 |
| 4 | 185 → 250 | 125 → 138 | 4 → 2 | 0.26 → 0.35 | 4.36 → 5.2 |

## Crafting recipes

There are no hard-coded recipes — all recipes are generated by `getProgUpgradeRecipe()` and `getEvolutionCost()`.

### Upgrade cost formula (`getProgUpgradeRecipe`, js/shared/progressionData.js:596-646)

Cost depends on `toLevel` (2-25) and `tier` (0-4).

Tier multiplier `_PROG_TIER_COST_MULT`:

| Tier | Multiplier | Citation |
|-----:|-----------:|----------|
| 0 | 1 | js/shared/progressionData.js:589 |
| 1 | 2.5 | js/shared/progressionData.js:589 |
| 2 | 5 | js/shared/progressionData.js:589 |
| 3 | 10 | js/shared/progressionData.js:589 |
| 4 | 20 | js/shared/progressionData.js:589 |

Bracket A — `toLevel <= 6`: `baseGold = 50 + (toLevel - 2) * 25`; ore amount = `toLevel - 1` (js/shared/progressionData.js:605-610)

| toLevel | baseGold | ore type |
|--------:|---------:|----------|
| 2 | 50 | coal |
| 3 | 75 | coal |
| 4 | 100 | copper |
| 5 | 125 | copper |
| 6 | 150 | iron |

Bracket B — `toLevel <= 13`: `baseGold = 200 + (toLevel - 7) * 50`; ore amount = `toLevel - 4` (js/shared/progressionData.js:611-616)

| toLevel | baseGold | ore |
|--------:|---------:|-----|
| 7 | 200 | steel |
| 8 | 250 | steel |
| 9 | 300 | steel |
| 10 | 350 | gold |
| 11 | 400 | gold |
| 12 | 450 | amethyst |
| 13 | 500 | amethyst |

Bracket C — `toLevel <= 19`: `baseGold = 600 + (toLevel - 14) * 120`; ore amount = `toLevel - 8` (js/shared/progressionData.js:617-622)

| toLevel | baseGold | ore |
|--------:|---------:|-----|
| 14 | 600 | ruby |
| 15 | 720 | ruby |
| 16 | 840 | diamond |
| 17 | 960 | diamond |
| 18 | 1080 | emerald |
| 19 | 1200 | emerald |

Bracket D — `toLevel <= 25`: `baseGold = 1500 + (toLevel - 20) * 300`; ore amount = `toLevel - 12` (js/shared/progressionData.js:623-628)

| toLevel | baseGold | ore |
|--------:|---------:|-----|
| 20 | 1500 | titanium |
| 21 | 1800 | titanium |
| 22 | 2100 | mythril |
| 23 | 2400 | mythril |
| 24 | 2700 | celestium |
| 25 | 3000 | celestium |

Final gold = `Math.round(baseGold * mult)` (js/shared/progressionData.js:631).

Parts cost = category part key from `_PROG_PART_KEYS[tier]` in quantity `Math.ceil((toLevel - 1) / 2)` (js/shared/progressionData.js:632-633).

`_PROG_PART_KEYS` (js/shared/progressionData.js:590-594):

| Category | T0 | T1 | T2 | T3 | T4 |
|----------|----|----|----|----|----|
| main_gun | common_weapon_parts | uncommon_weapon_parts | rare_gun_parts | epic_gun_parts | legendary_gun_parts |
| fishing_rod | common_weapon_parts | uncommon_weapon_parts | rare_rod_parts | epic_rod_parts | legendary_rod_parts |
| pickaxe | common_weapon_parts | uncommon_weapon_parts | rare_pick_parts | epic_pick_parts | legendary_pick_parts |

Gun-specific extra materials: for `main_gun` items where `MAIN_GUNS[id].upgradeMaterials` exists, each material is added at quantity `Math.max(1, Math.ceil((toLevel / 8) * Math.sqrt(mult)))` (js/shared/progressionData.js:636-643). Source values for those materials live in `MAIN_GUNS` (out of cluster — see gun cluster).

### Evolution costs (`EVOLUTION_COSTS`, js/shared/progressionData.js:490-511)

Item must be at level 25 of current tier and tier < 4 (js/shared/progressionData.js:514-516, also enforced in `CraftingSystem.canEvolve` js/authority/craftingSystem.js:73-74).

| From → To | Gold | Materials | Citation |
|-----------|-----:|-----------|----------|
| 0 → 1 (Common → Uncommon) | 2000 | uncommon_weapon_parts ×5, ore_steel ×10, ore_gold ×5 | js/shared/progressionData.js:492-495 |
| 1 → 2 (Uncommon → Rare) | 5000 | rare_weapon_parts ×8, ore_ruby ×8, ore_diamond ×5 | js/shared/progressionData.js:497-500 |
| 2 → 3 (Rare → Epic) | 12000 | epic_weapon_parts ×12, ore_emerald ×10, ore_titanium ×8 | js/shared/progressionData.js:502-505 |
| 3 → 4 (Epic → Legendary) | 30000 | legendary_weapon_parts ×15, ore_mythril ×12, ore_celestium ×10, ore_dusk ×5 | js/shared/progressionData.js:507-510 |

`getEvolutionCost(tier, itemId)` swaps generic `weapon_parts` keys for category-specific keys (`gun_parts`/`rod_parts`/`pick_parts`) and adds gun-specific materials at qty `3 * (tier + 1)` for main guns (js/shared/progressionData.js:521-557).

## Materials registry

(js/shared/craftingData.js:7-49)

### Generic weapon parts

| ID | Tier | Source | Citation |
|----|-----:|--------|----------|
| common_weapon_parts | 0 | cave | js/shared/craftingData.js:9 |
| uncommon_weapon_parts | 1 | cave | js/shared/craftingData.js:10 |
| rare_weapon_parts | 2 | cave | js/shared/craftingData.js:11 |
| epic_weapon_parts | 3 | cave | js/shared/craftingData.js:12 |
| legendary_weapon_parts | 4 | cave | js/shared/craftingData.js:13 |

### Category-specific parts

| ID | Tier | Category | Citation |
|----|-----:|----------|----------|
| rare_gun_parts | 2 | gun_part | js/shared/craftingData.js:16 |
| epic_gun_parts | 3 | gun_part | js/shared/craftingData.js:17 |
| legendary_gun_parts | 4 | gun_part | js/shared/craftingData.js:18 |
| rare_rod_parts | 2 | rod_part | js/shared/craftingData.js:19 |
| epic_rod_parts | 3 | rod_part | js/shared/craftingData.js:20 |
| legendary_rod_parts | 4 | rod_part | js/shared/craftingData.js:21 |
| rare_pick_parts | 2 | pick_part | js/shared/craftingData.js:22 |
| epic_pick_parts | 3 | pick_part | js/shared/craftingData.js:23 |
| legendary_pick_parts | 4 | pick_part | js/shared/craftingData.js:24 |

### Dungeon materials

| ID | Tier | Source | Citation |
|----|-----:|--------|----------|
| storm_capacitor | 1 | azurine | js/shared/craftingData.js:27 |
| wind_crystal | 2 | azurine | js/shared/craftingData.js:28 |
| volt_coil | 2 | azurine | js/shared/craftingData.js:29 |
| plasma_cell | 3 | azurine | js/shared/craftingData.js:30 |
| ironwood_limb | 1 | vortalis | js/shared/craftingData.js:33 |
| sinew_string | 2 | vortalis | js/shared/craftingData.js:34 |
| fletching_kit | 3 | vortalis | js/shared/craftingData.js:35 |
| heavy_barrel_liner | 2 | earth205 | js/shared/craftingData.js:38 |
| blast_powder | 3 | earth205 | js/shared/craftingData.js:39 |
| scatter_core | 2 | wagashi | js/shared/craftingData.js:42 |
| gunpowder_charge | 3 | wagashi | js/shared/craftingData.js:43 |
| buckshot_mold | 3 | wagashi | js/shared/craftingData.js:44 |
| shadow_alloy | 3 | earth216 | js/shared/craftingData.js:47 |
| neon_filament | 4 | earth216 | js/shared/craftingData.js:48 |

## Drop tables

### Default drop chance

| Name | Value | Citation |
|------|------:|----------|
| DEFAULT_DROP_CHANCE (mobs not in DROP_TABLES) | 0.12 | js/shared/craftingData.js:199 |

### Regular mob drop chances (uses dungeon pool)

| Mob | Chance | Citation |
|-----|------:|----------|
| grunt | 0.15 | js/shared/craftingData.js:107 |
| runner | 0.12 | js/shared/craftingData.js:108 |
| tank | 0.20 | js/shared/craftingData.js:109 |
| witch | 0.18 | js/shared/craftingData.js:110 |
| archer | 0.15 | js/shared/craftingData.js:111 |
| healer | 0.18 | js/shared/craftingData.js:112 |
| mummy | 0.10 | js/shared/craftingData.js:113 |
| neon_pickpocket | 0.15 | js/shared/craftingData.js:125 |
| cyber_mugger | 0.15 | js/shared/craftingData.js:126 |
| drone_lookout | 0.15 | js/shared/craftingData.js:127 |
| street_chemist | 0.18 | js/shared/craftingData.js:128 |
| renegade_bruiser | 0.18 | js/shared/craftingData.js:129 |
| renegade_shadowknife | 0.12 | js/shared/craftingData.js:130 |
| renegade_demo | 0.15 | js/shared/craftingData.js:131 |
| renegade_sniper | 0.15 | js/shared/craftingData.js:132 |

All bosses below have `dropChance: 1.0` (guaranteed). See full per-boss tables in `js/shared/craftingData.js:115-195`. Boss list: golem, the_don, velocity, captain_husa, admiral_von_kael, zongo, bloodborne_marlon, wolfbeard, ghostbeard, kraken_jim, king_requill, queen_siralyth, mami_wata, willis, puppedrill, sackhead, mr_schwallie, killer_mime, major_phantom, lady_red, the_boss_e205, lady_elixir, nofaux, sichou, tongya, jade_serpent, stone_golem_guardian, azure_dragon, jaja, gensai, moon_rabbit, celestial_toad, lord_sarugami, victor_graves, madame_midas, slasher_e216, blackout_belle, macabre_e216, rosa_calavera, motor_demon, nitro_wraith, hollow_ace, alcazar.

### Dungeon drop pools (regular mobs)

`DUNGEON_DROP_POOL[dungeonId][floor]` — floor 1 = tier 0 materials … floor 5 = tier 4 (js/shared/craftingData.js:54-97).

| Dungeon | F1 | F2 | F3 | F4 | F5 |
|---------|----|----|----|----|----|
| cave | common_weapon_parts | common+uncommon | uncommon+rare | rare+epic | epic+legendary |
| azurine | storm_capacitor + common | storm + wind_crystal | wind + volt_coil | volt + plasma_cell | plasma + storm |
| vortalis | ironwood + common | ironwood + sinew | sinew + fletching | fletching + ironwood | fletching + sinew |
| earth205 | heavy_barrel + common | heavy + uncommon | heavy + blast_powder | blast + heavy | blast + heavy |
| wagashi | scatter + common | scatter + gunpowder | gunpowder + buckshot | buckshot + scatter | buckshot + gunpowder |
| earth216 | shadow_alloy + common | shadow + uncommon | shadow + neon | neon + shadow | neon + shadow |

Citations: cave 55-61, azurine 62-68, vortalis 69-75, earth205 76-82, wagashi 83-89, earth216 90-96.

## Ore data (js/shared/oreData.js)

15 ore types across 4 mine rooms.

| ID | Tier | hp | value | rarity | minLvl | xp | Citation |
|----|----:|---:|------:|-------:|-------:|---:|----------|
| stone | 1 | 5 | 1 | 0.40 | 1 | 3 | js/shared/oreData.js:7 |
| coal | 1 | 7 | 1 | 0.25 | 1 | 4 | js/shared/oreData.js:8 |
| copper | 1 | 9 | 2 | 0.20 | 1 | 6 | js/shared/oreData.js:9 |
| iron | 2 | 12 | 3 | 0.15 | 3 | 9 | js/shared/oreData.js:10 |
| steel | 2 | 16 | 4 | 0.15 | 8 | 12 | js/shared/oreData.js:13 |
| gold | 3 | 20 | 5 | 0.10 | 12 | 18 | js/shared/oreData.js:14 |
| amethyst | 3 | 24 | 7 | 0.08 | 16 | 22 | js/shared/oreData.js:15 |
| ruby | 4 | 30 | 10 | 0.06 | 20 | 30 | js/shared/oreData.js:18 |
| diamond | 4 | 35 | 14 | 0.05 | 25 | 40 | js/shared/oreData.js:19 |
| emerald | 4 | 35 | 16 | 0.04 | 30 | 50 | js/shared/oreData.js:20 |
| titanium | 5 | 42 | 20 | 0.035 | 35 | 65 | js/shared/oreData.js:23 |
| mythril | 5 | 48 | 24 | 0.03 | 40 | 80 | js/shared/oreData.js:24 |
| celestium | 5 | 55 | 28 | 0.025 | 45 | 100 | js/shared/oreData.js:25 |
| obsidian | 5 | 60 | 32 | 0.02 | 50 | 125 | js/shared/oreData.js:26 |
| dusk | 5 | 70 | 40 | 0.015 | 55 | 150 | js/shared/oreData.js:27 |

### Mine room → ore mapping (js/shared/oreData.js:31-36)

| Room | Ores |
|------|------|
| mine_01 | stone, coal, copper, iron |
| mine_02 | steel, gold, amethyst |
| mine_03 | ruby, diamond, emerald |
| mine_04 | titanium, mythril, celestium, obsidian, dusk |

`pickRandomOreForRoom(roomId)` — weighted by `rarity` (js/shared/oreData.js:39-52). `pickRandomOre()` falls back to all ores (js/shared/oreData.js:55-65).

## Behavior

### Inventory add (js/authority/inventorySystem.js:51-66)

1. If `item.stackable`, walk slots; first matching id+stackable slot has its `count` incremented and the function returns true.
2. Else, if `inventory.length >= MAX_INVENTORY_SLOTS` (200), spawn an "INVENTORY FULL" hit effect at `(player.x, player.y - 40)` with life 30 and return false.
3. Else push item to end of array, return true.

### Material removal (js/authority/inventorySystem.js:111-124)

1. Walk inventory back-to-front.
2. For each matching slot, if `item.count <= remaining`, splice it out and subtract its count from `remaining`.
3. Otherwise decrement `item.count` by `remaining` and exit.

### Equip (js/authority/inventorySystem.js:236-268)

1. If item type not in `ITEM_CATEGORIES.equipment`, no-op.
2. If the same item id is already equipped, unequip back to default (gun/melee) or null (other slots), and call `recalcMaxHp()` if chest.
3. Otherwise: gun → `applyGunStats` then clamp ammo; melee → `applyMeleeStats`; armor/accessory → write to `playerEquip[type]` (and `recalcMaxHp` for chest).

### Crafting upgrade (js/authority/craftingSystem.js:33-66)

1. Compute `toLevel = currentLevel + 1`.
2. `canUpgrade` checks gold and every ore (`ore_<id>`) and part listed in the recipe (js/authority/craftingSystem.js:15-30).
3. Deduct gold (`gold -= recipe.gold`), then `removeMaterial('ore_'+oreId, qty)` for each ore and `removeMaterial(partId, qty)` for each part.
4. Call `_setGunProgress(gunId, tier, toLevel)`.
5. If `resetCombatState` exists, call `resetCombatState('lobby')`.
6. Spawn "LEVEL UP!" hit effect (life 40) at `(player.x, player.y - 40)`.
7. Save via `SaveLoad.save()` if available.

### Crafting evolve (js/authority/craftingSystem.js:71-116)

1. `canEvolve` requires owned + tier matches + level ≥ 25 + tier < `PROGRESSION_CONFIG.TIERS - 1`.
2. Look up `getEvolutionCost(tier, gunId)` (with category-specific part swap).
3. Verify gold and every material id present.
4. Deduct gold and each material via `removeMaterial`.
5. `_setGunProgress(gunId, tier+1, 1)` — bumps tier and resets level to 1.
6. Reset combat state and push "PRESTIGE: <TierName>!" hit effect (life 60).
7. Save.

### Drop resolution (`getMobDrop`, js/shared/craftingData.js:223-254)

1. Look up table by mob type; chance defaults to `DEFAULT_DROP_CHANCE` (0.12) if missing.
2. `Math.random() > chance` → no drop.
3. If a specific items array exists: sum weights, roll, walk array subtracting weights, and roll `count` uniformly in `[countMin, countMax]`.
4. Else use `DUNGEON_DROP_POOL[dungeonId][floor]` (fallback to floor 1) and pick uniformly with `count = 1`.

### Stat interpolation (`getProgressedStats`, js/shared/progressionData.js:411-460)

1. Clamp `tier` to `[0, 4]` and `level` to `[1, 25]`.
2. `t = (level - 1) / 24`.
3. For every key present in either `base` or `max`, compute `b + (m - b) * t`. If the key is in `_FRACTIONAL_STATS`, round to 2 decimals; else round to int. If only one of `base`/`max` provides the key, copy that value.
4. Apply `def.flags` directly onto the stats (e.g. `pierce`, `isArrow`, `special`).
5. Attach `bulletColor` if defined.

## Dependencies

- Reads: `gold`, `inventory`, `player`, `playerEquip`, `gun`, `melee`, `hitEffects` (js/authority/gameState.js).
- Reads: `GUN_DEFAULTS`, `MELEE_DEFAULTS`, `DEFAULT_GUN`, `DEFAULT_MELEE`, `ITEM_CATEGORIES` (js/shared/itemData.js, js/shared/gunData.js — out of cluster).
- Reads: `MAIN_GUNS[id].upgradeMaterials`, `GUN_MATERIALS` (out of cluster) when computing main_gun upgrade/evolution material extras.
- Reads: `_getGunProgress`, `_setGunProgress` (out of cluster — progression state for the player).
- Calls: `recalcMaxHp()` (out of cluster — armor stat recalc).
- Calls: `resetCombatState('lobby')` (out of cluster — clears combat state on tier/level change).
- Calls: `SaveLoad.save()` (js/core/saveLoad.js).
- Writes: `inventory[]`, `gold`, `gun.*`, `melee.*`, `playerEquip.*`, `hitEffects[]`.

## Edge cases

- `addToInventory` does not check `stackable` flag of an existing slot before merging beyond the matching id check; an item created via `createConsumable` always has `stackable: true` so this is consistent in practice (js/authority/inventorySystem.js:52-58).
- `countMaterialInInventory` filters by `type === 'material'` first, then falls back to id-only matching only when the id starts with `ore_` AND no material-typed match was found — ore stacks created without `type:'material'` would still be found, but ore stacks shadowed by an empty material match would not (js/authority/inventorySystem.js:92-107).
- `equipItem` for armor/accessory writes `item.data` directly to `playerEquip[type]`; the original inventory slot is not removed, so the same item can be "equipped" while still occupying its slot (js/authority/inventorySystem.js:265).
- `unequipItem` returns false silently if the inventory is full — caller must handle (js/authority/inventorySystem.js:287).
- `createMainGun`/`createPickaxe` overload: `(id, level)` legacy treats first arg as level and tier as 0; `(id, tier, level)` new signature uses both. Detected by `level !== undefined` (js/authority/inventorySystem.js:142-149, 188-191).
- `getProgUpgradeRecipe` returns null for `toLevel < 2 || toLevel > 25 || tier < 0 || tier > 4` — there is no level 1 upgrade and no level 26 / tier 5 (js/shared/progressionData.js:598).
- `getEvolutionCost` clones materials with category-specific keys but only swaps entries that have a mapping in `_partSwap`; ore materials (`ore_steel`, etc.) pass through unchanged (js/shared/progressionData.js:530-544).
- The 0→1 evolution cost includes `uncommon_weapon_parts` (not generic), so the `_partSwap` map (which only swaps `rare/epic/legendary_weapon_parts`) does not affect tier 0→1 — the same parts cost is used for guns, rods, and picks at this transition (js/shared/progressionData.js:494, 530-534).
- Pickaxe `unlockGate` fields exist on the data but are not consumed by inventory/crafting code in this cluster — gating is enforced elsewhere.
- `pickRandomOreForRoom` falls back to `'stone'` if the room id is unknown or its array is empty (js/shared/oreData.js:41).
- `getMobDrop` boss tables fall back to the first item if the weighted roll underflows (js/shared/craftingData.js:243).
- `obsidian` and `dusk` ores are NOT referenced by `_PROG_PART_KEYS` brackets (upgrades top out at celestium at level 24-25) — they exist for evolution costs only (`ore_dusk` in tier 3→4, js/shared/progressionData.js:509; obsidian appears in no recipe).
- Floor 1 of every dungeon includes `common_weapon_parts` even though the comment says "Floor 1=tier0" — Cave is the only dungeon whose floor 1 is *just* common parts (js/shared/craftingData.js:55-96).
