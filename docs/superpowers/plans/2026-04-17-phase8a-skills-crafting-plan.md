# Phase 8a: Mining + Fishing + Farming + Crafting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port 3 skill minigames (Mining, Fishing, Farming) and the Crafting backend to Unity, with full scene navigation, vendors, and save/load.

**Architecture:** Task 0 builds shared systems (SkillSystem, ProgressionSystem, CraftMaterialData, SaveSystem v3). Tasks 1-4 are fully independent and run in parallel — each builds one complete skill with its own data, scene logic, and vendor UI.

**Tech Stack:** Unity 6 (6000.4.0f1), C#, 2D Built-in Render Pipeline, OnGUI for panels, ShopFramework for UI scaling.

**Spec:** `docs/superpowers/specs/2026-04-17-phase8a-skills-crafting-design.md`

---

## File Map

### Task 0: Shared Foundation
- Create: `Assets/Scripts/SkillSystem.cs`
- Create: `Assets/Scripts/ProgressionSystem.cs`
- Create: `Assets/Scripts/CraftMaterialData.cs`
- Modify: `Assets/Scripts/SaveSystem.cs` — v2 → v3 (add skill XP, gun levels, tool ownership)
- Modify: `Assets/Scripts/GameBootstrap.cs` — add ProgressionSystem to singleton GO

### Task 1: Mining
- Create: `Assets/Scripts/MiningSystem.cs`
- Modify: `Assets/Scripts/UI/MiningShopPanelUI.cs` — wire 11 stubs
- Modify: `Assets/Scripts/ChatSystem.cs` — add `/mine` debug command

### Task 2: Fishing
- Create: `Assets/Scripts/FishingSystem.cs`
- Create: `Assets/Scripts/UI/FishingVendorPanelUI.cs`
- Modify: `Assets/Scripts/GameBootstrap.cs` — add FishingVendorPanelUI
- Modify: `Assets/Scripts/ChatSystem.cs` — add `/fish` debug command

### Task 3: Farming
- Create: `Assets/Scripts/FarmingSystem.cs`
- Create: `Assets/Scripts/UI/FarmVendorPanelUI.cs`
- Modify: `Assets/Scripts/GameBootstrap.cs` — add FarmVendorPanelUI
- Modify: `Assets/Scripts/ChatSystem.cs` — add `/farm` debug command

### Task 4: Crafting
- Create: `Assets/Scripts/CraftingSystem.cs`
- Modify: `Assets/Scripts/UI/ForgePanelUI.cs` — wire 13 stubs
- Modify: `Assets/Scripts/DamageSystem.cs` — add material drop on mob kill
- Modify: `Assets/Scripts/UI/GunsmithPanelUI.cs` — migrate _gunLevels to ProgressionSystem

---

## Shared API Signatures (ALL agents must use these EXACTLY)

### Existing Singletons
```csharp
CombatState.Instance          // .hp, .maxHp, .gold, .kills, .isDead, .godMode, .opMode
InventorySystem.Instance      // .AddItem(Item), .RemoveItem(slot), .CountMaterial(id), .RemoveMaterial(id, count)
GameSceneManager.Instance     // .CurrentScene, .Is("mine"), .LoadLevel(id, tx, ty), .StartTransition(id, tx, ty)
TileCollision.Instance        // .IsSolid(col, row), .TILE=48f, .gridWidth, .gridHeight
MobManager.Instance           // .activeMobs, .ClearAll(), .SpawnMob(type, x, y)
PanelManager.Instance         // .Register(id, onOpen, onClose), .Open(id), .Close(), .Toggle(id)
WaveSystem.Instance           // .isActive, .currentDungeon, .dungeonFloor, .wave
PlayerController              // via Object.FindAnyObjectByType<PlayerController>(), .transform.position
```

### ItemData Static Methods
```csharp
ItemData.CreateMaterial(string id, string name, int count = 1)  // returns stackable Item
ItemData.CreateConsumable(string id, string name, int count = 1)
ItemData.CreateEquipment(ItemType type, EquipData data)
```

### ShopFramework Static Helpers (for OnGUI panels)
```csharp
ShopFramework.DrawPanel(pw, ph, dim)       // returns (px, py) in JS coords
ShopFramework.DrawHeader(px, py, pw, title, gold, barH)  // returns close btn Rect
ShopFramework.DrawRect(x, y, w, h, color)
ShopFramework.DrawRectBorder(x, y, w, h, fill, border, borderW)
ShopFramework.DrawTabs(px, py, pw, tabs, activeIdx, tabH, pad)
ShopFramework.HitTest(rect)               // true if mouse clicked in rect
ShopFramework.MakeStyle(fontSize, color, fontStyle, anchor)
ShopFramework.SX/SY/SW/SH(val)            // JS-coord → screen-coord scaling
ShopFramework.WhiteTex                     // 1x1 white texture for GUI.DrawTexture
```

### New Systems (Task 0 creates these — Tasks 1-4 consume them)
```csharp
// SkillSystem — static class
SkillSystem.AddXP(string skill, int xp)
SkillSystem.GetLevel(string skill)         // computed from XP thresholds
SkillSystem.GetXP(string skill)
SkillSystem.GetXPForLevel(int level)       // XP needed to reach this level
SkillSystem.GetAllXP()                     // Dictionary<string,int> for save
SkillSystem.LoadFrom(Dictionary<string,int> data)

// ProgressionSystem — singleton MonoBehaviour
ProgressionSystem.Instance
ProgressionSystem.Instance.GetProgress(string itemId)    // returns GunProgress {tier,level,owned}
ProgressionSystem.Instance.SetProgress(string itemId, int tier, int level)
ProgressionSystem.Instance.GetDef(string itemId)         // returns ProgItemDef or null
ProgressionSystem.Instance.GetItemsByCategory(string cat) // "main_gun","pickaxe","fishing_rod"
ProgressionSystem.Instance.GetUpgradeRecipe(string itemId, int tier, int toLevel) // returns UpgradeRecipe
ProgressionSystem.Instance.GetEvolutionCost(int tier, string itemId) // returns EvoCost
ProgressionSystem.Instance.GetStats(string itemId, int tier, int level) // returns ProgStats

// CraftMaterialData — static class
CraftMaterialData.GetMaterial(string id)                // returns MaterialDef or null
CraftMaterialData.GetAllMaterials()                     // Dictionary<string,MaterialDef>
CraftMaterialData.GetMobDrop(string mobType, string dungeonId, int floor) // returns (string materialId, int count)?
CraftMaterialData.CreateMaterialItem(string materialId, int count) // returns ItemData.Item

// SaveSystem v3
SaveSystem.Save()   // now includes skillXP, gunLevels, toolOwnership
SaveSystem.Load()
SaveSystem.Delete()
```

---

## Task 0: Shared Foundation

**Files:**
- Create: `Assets/Scripts/SkillSystem.cs`
- Create: `Assets/Scripts/ProgressionSystem.cs`
- Create: `Assets/Scripts/CraftMaterialData.cs`
- Modify: `Assets/Scripts/SaveSystem.cs`
- Modify: `Assets/Scripts/GameBootstrap.cs`

### Step 0.1: Create SkillSystem.cs

- [ ] Create `Assets/Scripts/SkillSystem.cs`:

```csharp
// SkillSystem — Phase 8a
// Static XP tracker for all skills (Mining, Fishing, Farming, Cooking).
// Source: js/shared/skillRegistry.js, js/authority/farmingSystem.js:addSkillXP
using System.Collections.Generic;
using UnityEngine;

public static class SkillSystem
{
    static readonly Dictionary<string, int> _xp = new Dictionary<string, int>();

    // XP thresholds — js/shared/skillRegistry.js:15-25
    // Level N requires sum of (N * 50) XP total. Simplified: level = floor(sqrt(totalXP / 25))
    // JS formula: each level costs level*50 XP. Total XP for level L = sum(1..L) * 50 = L*(L+1)/2 * 50 = 25*L*(L+1)
    public static int GetXPForLevel(int level)
    {
        if (level <= 0) return 0;
        return 25 * level * (level + 1); // cumulative XP needed to REACH this level
    }

    public static int GetLevel(string skill)
    {
        int xp = GetXP(skill);
        // Inverse of 25*L*(L+1) = xp → L = floor((-1 + sqrt(1 + 4*xp/25)) / 2)
        if (xp <= 0) return 0;
        int level = Mathf.FloorToInt((-1f + Mathf.Sqrt(1f + 4f * xp / 25f)) / 2f);
        return Mathf.Max(0, level);
    }

    public static int GetXP(string skill)
    {
        return _xp.TryGetValue(skill, out int v) ? v : 0;
    }

    public static void AddXP(string skill, int xp)
    {
        if (xp <= 0) return;
        if (!_xp.ContainsKey(skill)) _xp[skill] = 0;
        int oldLevel = GetLevel(skill);
        _xp[skill] += xp;
        int newLevel = GetLevel(skill);
        if (newLevel > oldLevel)
            Debug.Log($"[SkillSystem] {skill} leveled up! {oldLevel} → {newLevel}");
    }

    public static Dictionary<string, int> GetAllXP() => new Dictionary<string, int>(_xp);

    public static void LoadFrom(Dictionary<string, int> data)
    {
        _xp.Clear();
        if (data != null)
            foreach (var kv in data) _xp[kv.Key] = kv.Value;
    }

    public static void Reset()
    {
        _xp.Clear();
    }
}
```

- [ ] Check compilation via `read_console`.

### Step 0.2: Create CraftMaterialData.cs

- [ ] Create `Assets/Scripts/CraftMaterialData.cs`:

```csharp
// CraftMaterialData — Phase 8a
// Static material registry + drop tables. Source: js/shared/craftingData.js
using System.Collections.Generic;
using UnityEngine;

public static class CraftMaterialData
{
    public struct MaterialDef
    {
        public string id, name, desc, category, source;
        public int tier;
        public Color color;
    }

    // === MATERIAL REGISTRY === js/shared/craftingData.js:7-49
    static readonly Dictionary<string, MaterialDef> MATERIALS = new Dictionary<string, MaterialDef>
    {
        // Generic Weapon Parts (Cave) — :9-13
        { "common_weapon_parts",    new MaterialDef { id="common_weapon_parts",    name="Common Weapon Parts",    tier=0, color=HexColor("#888888"), category="generic_part", source="cave" } },
        { "uncommon_weapon_parts",  new MaterialDef { id="uncommon_weapon_parts",  name="Uncommon Weapon Parts",  tier=1, color=HexColor("#5fca80"), category="generic_part", source="cave" } },
        { "rare_weapon_parts",      new MaterialDef { id="rare_weapon_parts",      name="Rare Weapon Parts",      tier=2, color=HexColor("#4a9eff"), category="generic_part", source="cave" } },
        { "epic_weapon_parts",      new MaterialDef { id="epic_weapon_parts",      name="Epic Weapon Parts",      tier=3, color=HexColor("#ff9a40"), category="generic_part", source="cave" } },
        { "legendary_weapon_parts", new MaterialDef { id="legendary_weapon_parts", name="Legendary Weapon Parts", tier=4, color=HexColor("#ff4a8a"), category="generic_part", source="cave" } },
        // Category-specific parts — :16-24
        { "rare_gun_parts",         new MaterialDef { id="rare_gun_parts",         name="Rare Gun Parts",         tier=2, color=HexColor("#4a9eff"), category="gun_part",  source="cave" } },
        { "epic_gun_parts",         new MaterialDef { id="epic_gun_parts",         name="Epic Gun Parts",         tier=3, color=HexColor("#ff9a40"), category="gun_part",  source="cave" } },
        { "legendary_gun_parts",    new MaterialDef { id="legendary_gun_parts",    name="Legendary Gun Parts",    tier=4, color=HexColor("#ff4a8a"), category="gun_part",  source="cave" } },
        { "rare_rod_parts",         new MaterialDef { id="rare_rod_parts",         name="Rare Rod Parts",         tier=2, color=HexColor("#4a9eff"), category="rod_part",  source="cave" } },
        { "epic_rod_parts",         new MaterialDef { id="epic_rod_parts",         name="Epic Rod Parts",         tier=3, color=HexColor("#ff9a40"), category="rod_part",  source="cave" } },
        { "legendary_rod_parts",    new MaterialDef { id="legendary_rod_parts",    name="Legendary Rod Parts",    tier=4, color=HexColor("#ff4a8a"), category="rod_part",  source="cave" } },
        { "rare_pick_parts",        new MaterialDef { id="rare_pick_parts",        name="Rare Pick Parts",        tier=2, color=HexColor("#4a9eff"), category="pick_part", source="cave" } },
        { "epic_pick_parts",        new MaterialDef { id="epic_pick_parts",        name="Epic Pick Parts",        tier=3, color=HexColor("#ff9a40"), category="pick_part", source="cave" } },
        { "legendary_pick_parts",   new MaterialDef { id="legendary_pick_parts",   name="Legendary Pick Parts",   tier=4, color=HexColor("#ff4a8a"), category="pick_part", source="cave" } },
        // Azurine — :27-30
        { "storm_capacitor",        new MaterialDef { id="storm_capacitor",        name="Storm Capacitor",        tier=1, color=HexColor("#66ccff"), category="dungeon_material", source="azurine" } },
        { "wind_crystal",           new MaterialDef { id="wind_crystal",           name="Wind Crystal",           tier=2, color=HexColor("#aaddff"), category="dungeon_material", source="azurine" } },
        { "volt_coil",              new MaterialDef { id="volt_coil",              name="Volt Coil",              tier=2, color=HexColor("#aa66ff"), category="dungeon_material", source="azurine" } },
        { "plasma_cell",            new MaterialDef { id="plasma_cell",            name="Plasma Cell",            tier=3, color=HexColor("#cc99ff"), category="dungeon_material", source="azurine" } },
        // Vortalis — :33-35
        { "ironwood_limb",          new MaterialDef { id="ironwood_limb",          name="Ironwood Limb",          tier=1, color=HexColor("#8b5e3c"), category="dungeon_material", source="vortalis" } },
        { "sinew_string",           new MaterialDef { id="sinew_string",           name="Sinew String",           tier=2, color=HexColor("#a07050"), category="dungeon_material", source="vortalis" } },
        { "fletching_kit",          new MaterialDef { id="fletching_kit",          name="Fletching Kit",          tier=3, color=HexColor("#c4a060"), category="dungeon_material", source="vortalis" } },
        // Earth-205 — :38-39
        { "heavy_barrel_liner",     new MaterialDef { id="heavy_barrel_liner",     name="Heavy Barrel Liner",     tier=2, color=HexColor("#ff9944"), category="dungeon_material", source="earth205" } },
        { "blast_powder",           new MaterialDef { id="blast_powder",           name="Blast Powder",           tier=3, color=HexColor("#ffbb77"), category="dungeon_material", source="earth205" } },
        // Wagashi — :42-44
        { "scatter_core",           new MaterialDef { id="scatter_core",           name="Scatter Core",           tier=2, color=HexColor("#ffcc33"), category="dungeon_material", source="wagashi" } },
        { "gunpowder_charge",       new MaterialDef { id="gunpowder_charge",       name="Gunpowder Charge",       tier=3, color=HexColor("#ffdd77"), category="dungeon_material", source="wagashi" } },
        { "buckshot_mold",          new MaterialDef { id="buckshot_mold",          name="Buckshot Mold",          tier=3, color=HexColor("#dda030"), category="dungeon_material", source="wagashi" } },
        // Earth-216 — :47-48
        { "shadow_alloy",           new MaterialDef { id="shadow_alloy",           name="Shadow Alloy",           tier=3, color=HexColor("#8866aa"), category="dungeon_material", source="earth216" } },
        { "neon_filament",          new MaterialDef { id="neon_filament",          name="Neon Filament",          tier=4, color=HexColor("#ff66cc"), category="dungeon_material", source="earth216" } },
    };

    // === DUNGEON DROP POOLS === js/shared/craftingData.js:54-97
    // floor 1=tier0 .. floor 5=tier4
    static readonly Dictionary<string, string[][]> DROP_POOLS = new Dictionary<string, string[][]>
    {
        { "cave", new[] {
            new[]{"common_weapon_parts"},
            new[]{"common_weapon_parts","uncommon_weapon_parts"},
            new[]{"uncommon_weapon_parts","rare_weapon_parts"},
            new[]{"rare_weapon_parts","epic_weapon_parts"},
            new[]{"epic_weapon_parts","legendary_weapon_parts"},
        }},
        { "azurine", new[] {
            new[]{"storm_capacitor","common_weapon_parts"},
            new[]{"storm_capacitor","wind_crystal"},
            new[]{"wind_crystal","volt_coil"},
            new[]{"volt_coil","plasma_cell"},
            new[]{"plasma_cell","storm_capacitor"},
        }},
        { "vortalis", new[] {
            new[]{"ironwood_limb","common_weapon_parts"},
            new[]{"ironwood_limb","sinew_string"},
            new[]{"sinew_string","fletching_kit"},
            new[]{"fletching_kit","ironwood_limb"},
            new[]{"fletching_kit","sinew_string"},
        }},
        { "earth205", new[] {
            new[]{"heavy_barrel_liner","common_weapon_parts"},
            new[]{"heavy_barrel_liner","uncommon_weapon_parts"},
            new[]{"heavy_barrel_liner","blast_powder"},
            new[]{"blast_powder","heavy_barrel_liner"},
            new[]{"blast_powder","heavy_barrel_liner"},
        }},
        { "wagashi", new[] {
            new[]{"scatter_core","common_weapon_parts"},
            new[]{"scatter_core","gunpowder_charge"},
            new[]{"gunpowder_charge","buckshot_mold"},
            new[]{"buckshot_mold","scatter_core"},
            new[]{"buckshot_mold","gunpowder_charge"},
        }},
        { "earth216", new[] {
            new[]{"shadow_alloy","common_weapon_parts"},
            new[]{"shadow_alloy","uncommon_weapon_parts"},
            new[]{"shadow_alloy","neon_filament"},
            new[]{"neon_filament","shadow_alloy"},
            new[]{"neon_filament","shadow_alloy"},
        }},
    };

    // === DROP TABLES === js/shared/craftingData.js:105-196
    // Per-mob-type drop config. null items = use dungeon pool.
    struct DropEntry
    {
        public float dropChance;
        public LootItem[] items; // null = use pool
    }
    struct LootItem
    {
        public string materialId;
        public int weight, countMin, countMax;
    }

    static readonly Dictionary<string, DropEntry> DROP_TABLES = BuildDropTables();
    const float DEFAULT_DROP_CHANCE = 0.12f; // :199

    static Dictionary<string, DropEntry> BuildDropTables()
    {
        var t = new Dictionary<string, DropEntry>();
        // Cave regular — :107-113
        t["grunt"]    = new DropEntry { dropChance = 0.15f };
        t["runner"]   = new DropEntry { dropChance = 0.12f };
        t["tank"]     = new DropEntry { dropChance = 0.20f };
        t["witch"]    = new DropEntry { dropChance = 0.18f };
        t["archer"]   = new DropEntry { dropChance = 0.15f };
        t["healer"]   = new DropEntry { dropChance = 0.18f };
        t["mummy"]    = new DropEntry { dropChance = 0.10f };
        // Cave boss — :116-122
        t["golem"] = new DropEntry { dropChance = 1f, items = new[] {
            new LootItem { materialId="rare_weapon_parts", weight=40, countMin=1, countMax=3 },
            new LootItem { materialId="epic_weapon_parts", weight=30, countMin=1, countMax=2 },
            new LootItem { materialId="uncommon_weapon_parts", weight=30, countMin=2, countMax=4 },
        }};
        // Azurine regular — :125-132
        t["neon_pickpocket"]      = new DropEntry { dropChance = 0.15f };
        t["cyber_mugger"]         = new DropEntry { dropChance = 0.15f };
        t["drone_lookout"]        = new DropEntry { dropChance = 0.15f };
        t["street_chemist"]       = new DropEntry { dropChance = 0.18f };
        t["renegade_bruiser"]     = new DropEntry { dropChance = 0.18f };
        t["renegade_shadowknife"] = new DropEntry { dropChance = 0.12f };
        t["renegade_demo"]        = new DropEntry { dropChance = 0.15f };
        t["renegade_sniper"]      = new DropEntry { dropChance = 0.15f };
        // Azurine bosses — :135-147
        t["the_don"]  = new DropEntry { dropChance = 1f, items = new[] {
            new LootItem { materialId="storm_capacitor", weight=50, countMin=1, countMax=3 },
            new LootItem { materialId="wind_crystal", weight=50, countMin=1, countMax=2 },
        }};
        t["velocity"] = new DropEntry { dropChance = 1f, items = new[] {
            new LootItem { materialId="storm_capacitor", weight=40, countMin=2, countMax=4 },
            new LootItem { materialId="volt_coil", weight=40, countMin=1, countMax=3 },
            new LootItem { materialId="plasma_cell", weight=20, countMin=1, countMax=2 },
        }};
        // NOTE: Full boss tables for Vortalis/Earth205/Wagashi/Earth216 must also be added here.
        // Copy from js/shared/craftingData.js:149-195 — same pattern as above.
        // Omitted for plan brevity but agent MUST port ALL entries from the JS file.
        return t;
    }

    // === PUBLIC API ===

    public static MaterialDef? GetMaterial(string id)
    {
        return MATERIALS.TryGetValue(id, out var m) ? m : (MaterialDef?)null;
    }

    public static Dictionary<string, MaterialDef> GetAllMaterials() => MATERIALS;

    /// <summary>
    /// Roll mob drop on kill. Returns (materialId, count) or null.
    /// Source: js/shared/craftingData.js:223-254 getMobDrop()
    /// </summary>
    public static (string materialId, int count)? GetMobDrop(string mobType, string dungeonId, int floor)
    {
        DropEntry entry;
        float chance;
        if (DROP_TABLES.TryGetValue(mobType, out entry))
            chance = entry.dropChance;
        else
            chance = DEFAULT_DROP_CHANCE;

        if (Random.value > chance) return null;

        // Specific loot table
        if (entry.items != null && entry.items.Length > 0)
        {
            int totalWeight = 0;
            foreach (var item in entry.items) totalWeight += item.weight;
            int roll = Random.Range(0, totalWeight);
            foreach (var item in entry.items)
            {
                roll -= item.weight;
                if (roll <= 0)
                {
                    int count = Random.Range(item.countMin, item.countMax + 1);
                    return (item.materialId, count);
                }
            }
            var fb = entry.items[0];
            return (fb.materialId, fb.countMin);
        }

        // Generic dungeon pool
        if (!DROP_POOLS.TryGetValue(dungeonId, out var pool)) return null;
        int fi = Mathf.Clamp(floor - 1, 0, pool.Length - 1);
        var floorPool = pool[fi];
        if (floorPool.Length == 0) return null;
        string matId = floorPool[Random.Range(0, floorPool.Length)];
        return (matId, 1);
    }

    public static ItemData.Item CreateMaterialItem(string materialId, int count)
    {
        var mat = GetMaterial(materialId);
        string name = mat.HasValue ? mat.Value.name : materialId;
        var item = ItemData.CreateMaterial(materialId, name, count);
        return item;
    }

    static Color HexColor(string hex)
    {
        ColorUtility.TryParseHtmlString(hex, out Color c);
        return c;
    }
}
```

- [ ] Check compilation via `read_console`.

### Step 0.3: Create ProgressionSystem.cs

- [ ] Create `Assets/Scripts/ProgressionSystem.cs`:

The agent implementing this task MUST read these JS files for exact values:
- `js/shared/progressionData.js` — full file, especially:
  - Lines 1-50: PROGRESSION_CONFIG (TIERS=5, LEVELS_PER_TIER=25, TIER_NAMES)
  - Lines 251-480: PROG_ITEMS registry (all guns, pickaxes, fishing_rods with category, buyPrice, stats)
  - Lines 489-511: EVOLUTION_COSTS (4 tiers)
  - Lines 579-646: getProgUpgradeRecipe() function (gold brackets, ore brackets, part keys, tier multipliers)
  - Lines 521-555: getEvolutionCost() function (category part swapping, gun-specific materials)
- `js/shared/gunData.js` — MAIN_GUNS registry for upgradeMaterials arrays

The script must implement:
```csharp
public class ProgressionSystem : MonoBehaviour
{
    public static ProgressionSystem Instance { get; private set; }

    // Structs
    public struct GunProgress { public int tier, level; public bool owned; }
    public struct ProgItemDef { public string id, name, category; public int buyPrice; /* + per-tier stat arrays */ }
    public struct UpgradeRecipe { public int gold; public Dictionary<string,int> ores; public Dictionary<string,int> parts; }
    public struct EvoCost { public int gold; public Dictionary<string,int> materials; }
    public struct ProgStats { public int damage, fireRate, magSize, reloadSpeed, range, cooldown; public float critChance; /* etc */ }

    // Storage
    Dictionary<string, GunProgress> _progress = new Dictionary<string, GunProgress>();

    // Public API
    public GunProgress GetProgress(string itemId);
    public void SetProgress(string itemId, int tier, int level);
    public ProgItemDef? GetDef(string itemId);
    public List<string> GetItemsByCategory(string category);
    public UpgradeRecipe? GetUpgradeRecipe(string itemId, int tier, int toLevel); // js/shared/progressionData.js:596-646
    public EvoCost? GetEvolutionCost(int tier, string itemId);                    // js/shared/progressionData.js:521-555
    public ProgStats? GetStats(string itemId, int tier, int level);
    public Dictionary<string, GunProgress> GetAllProgress();
    public void LoadFrom(Dictionary<string, GunProgress> data);
}
```

The agent MUST implement `GetUpgradeRecipe` with the EXACT bracket formulas from `js/shared/progressionData.js:596-646`:
- L2-6: baseGold = 50 + (toLevel-2)*25, ores = coal/copper/iron
- L7-13: baseGold = 200 + (toLevel-7)*50, ores = steel/gold/amethyst
- L14-19: baseGold = 600 + (toLevel-14)*120, ores = ruby/diamond/emerald
- L20-25: baseGold = 1500 + (toLevel-20)*300, ores = titanium/mythril/celestium
- Tier multiplier: [1, 2.5, 5, 10, 20]
- Parts key: category-specific (gun_parts, rod_parts, pick_parts)

- [ ] Check compilation via `read_console`.

### Step 0.4: Expand SaveSystem to v3

- [ ] Modify `Assets/Scripts/SaveSystem.cs`:

Add to SaveData class:
```csharp
public Dictionary<string, int> skillXP;                  // SkillSystem XP per skill
public Dictionary<string, GunProgressSave> gunLevels;    // ProgressionSystem progress
public ToolOwnership tools;                              // what tools player owns

[System.Serializable]
public class GunProgressSave { public int tier, level; public bool owned; }
[System.Serializable]
public class ToolOwnership
{
    public int rodTier = -1;      // -1 = not owned, 0-3 = tier
    public int hoeTier = -1;
    public int pickaxeTier = -1;
    public bool hasBucket;
    public int landLevel;         // farming land expansion level (0-7)
}
```

Update `Save()` to serialize SkillSystem.GetAllXP(), ProgressionSystem.GetAllProgress(), tool state.
Update `Load()` to call SkillSystem.LoadFrom(), ProgressionSystem.LoadFrom(), restore tool state.
Bump `SAVE_VERSION` to 3 with backwards compat (missing fields = defaults).

- [ ] Check compilation via `read_console`.

### Step 0.5: Wire GameBootstrap

- [ ] Add `ProgressionSystem` to the singleton GO in `GameBootstrap.EnsureCombatManagers()`:

```csharp
go.AddComponent<ProgressionSystem>();
```

Add it after the Phase 6 panel components, before the comment about EventSystem.

- [ ] Check compilation via `read_console`.

### Step 0.6: Commit

- [ ] Commit:
```
git add Assets/Scripts/SkillSystem.cs Assets/Scripts/ProgressionSystem.cs Assets/Scripts/CraftMaterialData.cs Assets/Scripts/SaveSystem.cs Assets/Scripts/GameBootstrap.cs
git commit -m "Phase 8a Task 0: SkillSystem + ProgressionSystem + CraftMaterialData + SaveSystem v3"
```

---

## Task 1: Mining

**Files:**
- Create: `Assets/Scripts/MiningSystem.cs`
- Modify: `Assets/Scripts/UI/MiningShopPanelUI.cs`
- Modify: `Assets/Scripts/ChatSystem.cs`

**JS source files the agent MUST read:**
- `js/authority/miningSystem.js` — full file (~600 lines)
- `js/shared/oreData.js` — full file (ore types, room mapping)
- `js/core/interactable.js:112-120` — mine vendor interactable

### Step 1.1: Create MiningSystem.cs

- [ ] Create `Assets/Scripts/MiningSystem.cs`:

The agent MUST read `js/authority/miningSystem.js` in full and port the following:

**Data (from js/shared/oreData.js):**
- `ORE_TYPES` — 15 ores: stone(HP5,1g,T1), coal(7,1g,T1), copper(9,2g,T1), iron(12,3g,T2), steel(16,4g,T2), gold_ore(20,5g,T3), amethyst(24,7g,T3), ruby(30,10g,T4), diamond(35,14g,T4), emerald(35,16g,T4), titanium(42,20g,T5), mythril(48,24g,T5), celestium(55,28g,T5), obsidian(60,32g,T5), dusk(70,40g,T5)
- `MINE_ROOM_ORES` — mine_01:[stone,coal,copper,iron], mine_02:[steel,gold,amethyst], mine_03:[ruby,diamond,emerald], mine_04:[titanium,mythril,celestium,obsidian,dusk]

**Constants (from js/authority/miningSystem.js:16-40):**
- Mining range: 90px
- Base tick rate: 44 frames
- Actual tick: `max(10, round(44 / miningSpeed))`
- Damage per tick: `max(1, floor(pickaxe.damage / 10))`
- Ore node visual size: 72px
- Hit flash: 6 frames
- Respawn: 690 frames (600 + 90 regrow)
- Pickup lifetime: 1800 frames (30s)
- Pickup auto-collect: <40px
- Spawn groups: 18 per room
- Ores per group: 5-6
- Inner spacing: 1.2 tiles
- Outer spacing: 12 tiles
- Wall margin: 4 tiles
- Spawn clearance: 4 tiles from player
- Exit clearance: 5 tiles from doors
- Placement radius: ±2 tiles from group center

**Behavior:**
- On scene load to mine room: spawn ore clusters using rarity-weighted selection from MINE_ROOM_ORES
- Player holds shoot (InputIntent equivalent) aimed at ore within 90px → tick timer decrements → damage ore → on depletion: spawn pickup, start respawn timer
- Crit roll: pickaxe.critChance → 2× damage
- Level-gated ores: check SkillSystem.GetLevel("Mining") >= ore.minLevel, else show lock icon
- Pickup auto-collect at <40px → add to inventory via InventorySystem.AddItem(ItemData.CreateMaterial("ore_" + oreType, oreName, 1))
- XP: SkillSystem.AddXP("Mining", ore.xp) on depletion
- Ore respawn: timer counts down, ore re-appears at same position

**Rendering (OnGUI or SpriteRenderer):**
- Ore nodes: colored circles (72px diameter) with ore color
- Hit flash: white flash for 6 frames when struck
- Locked ores: semi-transparent with lock text
- Pickups: small colored circles on ground

- [ ] Check compilation via `read_console`.

### Step 1.2: Wire MiningShopPanelUI stubs

- [ ] Read `Assets/Scripts/UI/MiningShopPanelUI.cs` in full.
- [ ] Replace all 11 stub methods to call ProgressionSystem and InventorySystem:
  - `GetPickaxeIds()` → `ProgressionSystem.Instance.GetItemsByCategory("pickaxe")`
  - `GetDef(id)` → `ProgressionSystem.Instance.GetDef(id)`
  - `GetProgress(id)` → `ProgressionSystem.Instance.GetProgress(id)`
  - `GetStats(id, tier, level)` → `ProgressionSystem.Instance.GetStats(id, tier, level)`
  - `GetUpgradeRecipe(id, tier, toLevel)` → `ProgressionSystem.Instance.GetUpgradeRecipe(id, tier, toLevel)`
  - `GetEvoCost(tier, id)` → `ProgressionSystem.Instance.GetEvolutionCost(tier, id)`
  - `CountMaterial(matId)` → `InventorySystem.Instance.CountMaterial(matId)`
  - `GetGold()` → `CombatState.Instance?.gold ?? 0`
  - Buy/Upgrade/Evolve button handlers → call CraftingSystem methods

- [ ] Check compilation via `read_console`.

### Step 1.3: Add /mine debug command

- [ ] Add to `ChatSystem.ProcessCommand()`, before the final "Unknown command" fallback:

```csharp
// /mine [n] — teleport to mine room (1-4)
if (lower.StartsWith("/mine"))
{
    int room = 1;
    if (parts.Length > 1 && int.TryParse(parts[1], out int r)) room = Mathf.Clamp(r, 1, 4);
    string levelId = "mine_0" + room;
    gsm?.StartTransition(levelId, 35, 44);
    AddMessage($"Teleported to Mine {room}", COL_GREEN);
    return;
}
```

- [ ] Check compilation via `read_console`.

### Step 1.4: Wire GameBootstrap

- [ ] Add `go.AddComponent<MiningSystem>();` to `GameBootstrap.EnsureCombatManagers()`.
- [ ] Check compilation via `read_console`.

### Step 1.5: Commit

```
git commit -m "Phase 8a Task 1: MiningSystem + wire MiningShopPanelUI"
```

---

## Task 2: Fishing

**Files:**
- Create: `Assets/Scripts/FishingSystem.cs`
- Create: `Assets/Scripts/UI/FishingVendorPanelUI.cs`
- Modify: `Assets/Scripts/GameBootstrap.cs`
- Modify: `Assets/Scripts/ChatSystem.cs`

**JS source files the agent MUST read:**
- `js/authority/fishingSystem.js` — full file (~700 lines)
- `js/shared/fishingData.js` — full file (rod tiers, fish species, config, catch formula)
- `js/core/interactable.js:64-73` — fish vendor interactable

### Step 2.1: Create FishingSystem.cs

- [ ] Create `Assets/Scripts/FishingSystem.cs`:

The agent MUST read `js/authority/fishingSystem.js` and `js/shared/fishingData.js` in full.

**Data (from js/shared/fishingData.js):**

Rod tiers — :9-18:
```
Bronze: tier=0, lvl=1, cost=20, durability=25, strength=1, catchBonus=0, damage=8, range=80, cooldown=34f, critChance=0
Iron:   tier=1, lvl=5, cost=80, durability=40, strength=2, catchBonus=0.10, damage=12, range=85, cooldown=30f, critChance=0.05
Gold:   tier=2, lvl=12, cost=200, durability=60, strength=3, catchBonus=0.20, damage=16, range=90, cooldown=26f, critChance=0.08
Mythic: tier=3, lvl=25, cost=500, durability=100, strength=5, catchBonus=0.35, damage=22, range=95, cooldown=22f, critChance=0.12
```

Fish species — :25-32:
```
Sardine:          rarity=40, sell=3,   difficulty=0.20, minRod=0, xp=5,   weight=1
Bass:             rarity=25, sell=8,   difficulty=0.35, minRod=0, xp=10,  weight=2
Salmon:           rarity=18, sell=15,  difficulty=0.50, minRod=1, xp=18,  weight=2
Tuna:             rarity=10, sell=25,  difficulty=0.65, minRod=1, xp=30,  weight=3
Swordfish:        rarity=5,  sell=50,  difficulty=0.80, minRod=2, xp=50,  weight=4
Golden Leviathan: rarity=2,  sell=120, difficulty=0.95, minRod=3, xp=100, weight=5
```

**State machine:**
1. IDLE → detect player near fishing_spot entity + melee swing → CASTING
2. CASTING (60f/1s) → bobber travels outward → WAITING
3. WAITING (180-480f random) → fish approaches → BITE
4. BITE (120f/2s window) → player presses reel (mouse click or key) → REELING. If missed → IDLE
5. REELING → tension/progress minigame:
   - No input: tension -= 0.004/frame
   - Holding reel: tension += 0.006/frame
   - Sweet spot: 0.2-0.85
   - In sweet spot: progress += 0.005 + (1-difficulty)*0.0025
   - Outside: progress -= difficulty*0.0006
   - Overweight: penalty = (weight-rod.strength)*0.25
   - Max line distance: 160px → snap → IDLE
   - Progress >= 1.0 → CATCH
6. CATCH → roll catch chance → success: add fish + XP. Fail: "got away"

**Catch formula (js/shared/fishingData.js:97-105):**
```
baseCatch = (1 - fish.difficulty) + rod.catchBonus + min(0.25, fishingLevel * 0.005)
          - max(0, fish.weight - rod.strength) * 0.25
catch = clamp(0.05, 0.95, baseCatch)
```

**Rod durability:** -1 per cast. At 0 → rod breaks.

**Starter bait:** 10 worms (js/authority/fishingSystem.js:35).

**Rendering:**
- Bobber: small circle at cast location
- Tension bar: vertical bar on screen during REELING
- Progress bar: horizontal bar during REELING
- Fish species name + "!" when bite occurs
- "Caught [fish]!" or "Got away..." result text

- [ ] Check compilation via `read_console`.

### Step 2.2: Create FishingVendorPanelUI.cs

- [ ] Create `Assets/Scripts/UI/FishingVendorPanelUI.cs`:

OnGUI panel using ShopFramework. Registered as "fishVendor" with PanelManager.

**Layout (read js/authority/fishingSystem.js:627-641 for vendor items):**
- Tab 1: Buy — list rod tiers (gated by Fishing level), Worm Bait ×10 (20g)
- Tab 2: Sell — list fish in inventory with sell prices
- Each row: item name, price, Buy/Sell button
- Gold display in header via ShopFramework.DrawHeader
- Level-gated items show lock + required level text

**Buy logic:**
- Rod: check gold >= cost && SkillSystem.GetLevel("Fishing") >= rod.levelReq
- Bait: check gold >= 20 → add 10 bait to inventory
- On buy: CombatState.gold -= cost, add item

**Sell logic:**
- Fish items: remove from inventory, CombatState.gold += fish.sellPrice * count

- [ ] Check compilation via `read_console`.

### Step 2.3: Wire GameBootstrap + interactable

- [ ] Add to GameBootstrap.EnsureCombatManagers():
```csharp
go.AddComponent<FishingSystem>();
go.AddComponent<FishingVendorPanelUI>();
```

- [ ] The fishing_spot and fish_vendor entities already exist in lobby level data. FishingSystem detects proximity to fishing_spot entity. Fish vendor opens "fishVendor" panel on E-key via existing interactable system (check how mine vendor works in interactable.js:112-120 and port similarly).

- [ ] Check compilation via `read_console`.

### Step 2.4: Add /fish debug command

- [ ] Add to ChatSystem.ProcessCommand():
```csharp
if (lower == "/fish")
{
    // Teleport to lobby fishing dock area
    var player = Object.FindAnyObjectByType<PlayerController>();
    if (player != null)
    {
        player.transform.position = new Vector3(37 * 48f, (80 - 1 - 58) * 48f, 0); // lobby fishing spot
        AddMessage("Teleported to fishing dock", COL_GREEN);
    }
    return;
}
```
Note: Y conversion uses lobby heightTiles. Agent must read lobby level data for exact heightTiles.

- [ ] Check compilation via `read_console`.

### Step 2.5: Commit

```
git commit -m "Phase 8a Task 2: FishingSystem + FishingVendorPanelUI"
```

---

## Task 3: Farming

**Files:**
- Create: `Assets/Scripts/FarmingSystem.cs`
- Create: `Assets/Scripts/UI/FarmVendorPanelUI.cs`
- Modify: `Assets/Scripts/GameBootstrap.cs`
- Modify: `Assets/Scripts/ChatSystem.cs`

**JS source files the agent MUST read:**
- `js/authority/farmingSystem.js` — full file (~500 lines)
- `js/shared/farmingData.js` — full file (hoe tiers, crops, land expansions, config)
- `js/core/interactable.js` — farm vendor interactable
- `js/shared/levelData.js:214-270` — house_01 level entities (farm zone, well, vendor, exit)

### Step 3.1: Create FarmingSystem.cs

- [ ] Create `Assets/Scripts/FarmingSystem.cs`:

The agent MUST read `js/authority/farmingSystem.js` and `js/shared/farmingData.js` in full.

**Data (from js/shared/farmingData.js):**

Hoe tiers — :10-15:
```
Bronze: tier=0, lvl=1, cost=20, reach=1, cooldown=36f, swingTiles=2
Iron:   tier=1, lvl=5, cost=80, reach=1, cooldown=30f, swingTiles=3
Gold:   tier=2, lvl=12, cost=200, reach=2, cooldown=24f, swingTiles=5
Mythic: tier=3, lvl=25, cost=500, reach=2, cooldown=20f, swingTiles=8
```

Crop types — :29-39: (9 crops, see spec for full table)

Land expansions — :58-67: (8 levels, 3×3 to 36×16, see spec for full table)

Config — :43-52:
```
tillCooldown=15f, plantCooldown=10f, harvestCooldown=15f, tileRange=60px, plotSize=48px
```

Bucket: cost=50g, levelReq=1 — :19-20

**Tile state machine:**
- EMPTY → till (hoe swing within tileRange, affects swingTiles tiles) → TILLED
- TILLED → plant (consume seed from inventory, check crop.levelReq + crop.gardenReq vs landLevel) → PLANTED
- PLANTED → water (bucket must be owned + filled at well <144px) → GROWING (growthTimer=0)
- GROWING → growthTimer += deltaTime per frame → at growthTimer >= crop.growthFrames/60 → HARVESTABLE
- HARVESTABLE → harvest → add crop to inventory + XP + reset tile to EMPTY

**Farm grid:**
- Built based on current landLevel expansion (width × height from LAND_EXPANSIONS)
- Centered in farm zone entity area
- Each tile = 48×48 px

**Well interaction:**
- Player within 144px of well entity → fill bucket (one-time per session)

**Rendering:**
- Tiles: colored squares — brown (EMPTY after till=TILLED), green seed (PLANTED), growing stages (GROWING), golden (HARVESTABLE)
- Growth progress bar on GROWING tiles
- Selected seed indicator
- Bucket fill indicator

- [ ] Check compilation via `read_console`.

### Step 3.2: Create FarmVendorPanelUI.cs

- [ ] Create `Assets/Scripts/UI/FarmVendorPanelUI.cs`:

OnGUI panel using ShopFramework. Registered as "farmVendor" with PanelManager.

**Tabs:**
1. Seeds — buy each crop type (level-gated), shows seed cost
2. Tools — buy hoe tiers (level-gated) + bucket (50g, one-time)
3. Land — buy land expansions (level + cost gated)
4. Sell — sell harvested crops for listed price

**Buy logic:** check gold + level requirements. On buy: deduct gold, add to inventory or set tool ownership.
**Sell logic:** remove crop from inventory, add gold.

- [ ] Check compilation via `read_console`.

### Step 3.3: Wire GameBootstrap

- [ ] Add to GameBootstrap.EnsureCombatManagers():
```csharp
go.AddComponent<FarmingSystem>();
go.AddComponent<FarmVendorPanelUI>();
```

- [ ] Check compilation via `read_console`.

### Step 3.4: Add /farm debug command

- [ ] Add to ChatSystem.ProcessCommand():
```csharp
if (lower == "/farm")
{
    gsm?.StartTransition("house_01", 20, 25);
    AddMessage("Teleported to farm", COL_GREEN);
    return;
}
```
Agent must verify spawn tile coords from js/shared/levelData.js house_01 entry.

- [ ] Check compilation via `read_console`.

### Step 3.5: Commit

```
git commit -m "Phase 8a Task 3: FarmingSystem + FarmVendorPanelUI"
```

---

## Task 4: Crafting

**Files:**
- Create: `Assets/Scripts/CraftingSystem.cs`
- Modify: `Assets/Scripts/UI/ForgePanelUI.cs`
- Modify: `Assets/Scripts/DamageSystem.cs`
- Modify: `Assets/Scripts/UI/GunsmithPanelUI.cs`

**JS source files the agent MUST read:**
- `js/authority/craftingSystem.js` — full file (117 lines)
- `js/shared/craftingData.js` — full file (254 lines) — material registry already in CraftMaterialData
- `js/shared/progressionData.js:521-555` — getEvolutionCost() category part swapping
- `js/client/ui/forgeUI.js` — full file for UI integration points

### Step 4.1: Create CraftingSystem.cs

- [ ] Create `Assets/Scripts/CraftingSystem.cs`:

```csharp
// CraftingSystem — Phase 8a
// Upgrade and evolve weapons/tools using materials.
// Source: js/authority/craftingSystem.js (117 lines)
using System.Collections.Generic;
using UnityEngine;

public static class CraftingSystem
{
    // Count material in inventory — js/authority/craftingSystem.js:8-10
    public static int GetMaterialCount(string materialId)
    {
        return InventorySystem.Instance != null ? InventorySystem.Instance.CountMaterial(materialId) : 0;
    }

    // === UPGRADE (level within tier) === js/authority/craftingSystem.js:14-66

    public static bool CanUpgrade(string itemId, int tier, int toLevel)
    {
        var ps = ProgressionSystem.Instance;
        if (ps == null) return false;
        var recipe = ps.GetUpgradeRecipe(itemId, tier, toLevel);
        if (!recipe.HasValue) return false;
        var r = recipe.Value;
        var cs = CombatState.Instance;
        if (cs == null || cs.gold < r.gold) return false;
        if (r.ores != null)
            foreach (var kv in r.ores)
                if (GetMaterialCount("ore_" + kv.Key) < kv.Value) return false;
        if (r.parts != null)
            foreach (var kv in r.parts)
                if (GetMaterialCount(kv.Key) < kv.Value) return false;
        return true;
    }

    public static bool Upgrade(string gunId, int tier, int currentLevel)
    {
        int toLevel = currentLevel + 1;
        if (!CanUpgrade(gunId, tier, toLevel)) return false;
        var ps = ProgressionSystem.Instance;
        var recipe = ps.GetUpgradeRecipe(gunId, tier, toLevel).Value;
        var cs = CombatState.Instance;
        var inv = InventorySystem.Instance;

        cs.gold -= recipe.gold;
        if (recipe.ores != null)
            foreach (var kv in recipe.ores)
                inv.RemoveMaterial("ore_" + kv.Key, kv.Value);
        if (recipe.parts != null)
            foreach (var kv in recipe.parts)
                inv.RemoveMaterial(kv.Key, kv.Value);

        ps.SetProgress(gunId, tier, toLevel);
        SaveSystem.Save();
        Debug.Log($"[CraftingSystem] Upgraded {gunId} to T{tier} L{toLevel}");
        return true;
    }

    // === EVOLVE (tier up, reset to level 1) === js/authority/craftingSystem.js:70-117

    public static bool CanEvolve(string gunId, int tier)
    {
        var ps = ProgressionSystem.Instance;
        if (ps == null) return false;
        var prog = ps.GetProgress(gunId);
        if (!prog.owned || prog.tier != tier || prog.level < 25) return false;
        if (tier >= 4) return false; // max tier — PROGRESSION_CONFIG.TIERS - 1

        var evoCost = ps.GetEvolutionCost(tier, gunId);
        if (!evoCost.HasValue) return false;
        var e = evoCost.Value;
        var cs = CombatState.Instance;
        if (cs == null || cs.gold < e.gold) return false;
        if (e.materials != null)
            foreach (var kv in e.materials)
                if (GetMaterialCount(kv.Key) < kv.Value) return false;
        return true;
    }

    public static bool Evolve(string gunId, int tier)
    {
        if (!CanEvolve(gunId, tier)) return false;
        var ps = ProgressionSystem.Instance;
        var evoCost = ps.GetEvolutionCost(tier, gunId).Value;
        var cs = CombatState.Instance;
        var inv = InventorySystem.Instance;

        cs.gold -= evoCost.gold;
        if (evoCost.materials != null)
            foreach (var kv in evoCost.materials)
                inv.RemoveMaterial(kv.Key, kv.Value);

        int nextTier = tier + 1;
        ps.SetProgress(gunId, nextTier, 1);
        SaveSystem.Save();
        Debug.Log($"[CraftingSystem] Evolved {gunId} to T{nextTier}");
        return true;
    }
}
```

- [ ] Check compilation via `read_console`.

### Step 4.2: Wire material drops into DamageSystem

- [ ] Read `Assets/Scripts/DamageSystem.cs` and find the mob kill processing (inside DealDamageToMob, after HP reaches 0).

- [ ] After the kill is processed (gold reward, etc.), add material drop roll:

```csharp
// Material drop — js/shared/craftingData.js:223-254
var ws = WaveSystem.Instance;
if (ws != null && ws.isActive)
{
    var drop = CraftMaterialData.GetMobDrop(mob.type, ws.currentDungeon, ws.dungeonFloor);
    if (drop.HasValue)
    {
        var item = CraftMaterialData.CreateMaterialItem(drop.Value.materialId, drop.Value.count);
        InventorySystem.Instance?.AddItem(item);
        Debug.Log($"[Drop] {drop.Value.count}x {drop.Value.materialId} from {mob.type}");
    }
}
```

- [ ] Check compilation via `read_console`.

### Step 4.3: Wire ForgePanelUI stubs

- [ ] Read `Assets/Scripts/UI/ForgePanelUI.cs` in full.
- [ ] Replace all 13 stub methods:
  - `Gold` property → `CombatState.Instance?.gold ?? 0`
  - `SpendGold(amount)` → `CombatState.Instance.gold -= amount`
  - `GetGunProgress(idx)` → `ProgressionSystem.Instance.GetProgress(GUN_IDS[idx])`
  - `SetGunProgress(id, tier, level)` → `ProgressionSystem.Instance.SetProgress(id, tier, level)`
  - Upgrade button → `CraftingSystem.Upgrade(id, tier, level)`
  - Evolve button → `CraftingSystem.Evolve(id, tier)`
  - `_upgradeEnabled` → `CraftingSystem.CanUpgrade(id, tier, level+1)`
  - `_evolveEnabled` → `CraftingSystem.CanEvolve(id, tier)`
  - Material count display → `InventorySystem.Instance.CountMaterial(matId)`
  - Upgrade recipe display → `ProgressionSystem.Instance.GetUpgradeRecipe(id, tier, level+1)`
  - Evo cost display → `ProgressionSystem.Instance.GetEvolutionCost(tier, id)`
  - Material list (tab 3) → iterate `CraftMaterialData.GetAllMaterials()` with counts from inventory

- [ ] Check compilation via `read_console`.

### Step 4.4: Migrate GunsmithPanelUI._gunLevels

- [ ] Read `Assets/Scripts/UI/GunsmithPanelUI.cs`.
- [ ] Replace `_gunLevels` dictionary usage with `ProgressionSystem.Instance.GetProgress(id)` and `SetProgress(id, tier, level)`.
- [ ] Remove the local `_gunLevels` dictionary, `GetGunProgress()`, `SetGunProgress()` methods.
- [ ] Check compilation via `read_console`.

### Step 4.5: Commit

```
git commit -m "Phase 8a Task 4: CraftingSystem + wire ForgePanelUI + material drops"
```

---

## Post-Implementation

### Final integration check
- [ ] Increment `GAME_CONFIG.GAME_UPDATE` in `js/shared/gameConfig.js`
- [ ] `read_console` — verify 0 errors, 0 warnings
- [ ] Commit + push all changes

### Exit gate verification (Play mode)
- Walk into mine → mine ores → sell at vendor → XP levels up
- Cast rod at dock → reel fish → sell at vendor → XP levels up
- Enter farm → till → plant → water → wait → harvest → sell → XP
- Kill dungeon mobs → collect material drops → forge → upgrade weapon
- Save → reload → all data persists

### Debug commands for testing
- `/mine [1-4]` — teleport to mine room
- `/fish` — teleport to fishing dock
- `/farm` — teleport to farm
- Existing: `/gold`, `/op`, `/heal` for testing purchases
