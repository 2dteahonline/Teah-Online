# Shared Data — Misc Registries

This file documents the "everything else" shared data files: cosmetic registries (armor visuals, skills), party/bot config, fishing, farming, and the Mafia + Hide & Seek game modes. Each sub-section follows the standard GDD schema.

## Source of truth

- `js/shared/armorVisuals.js` — armor tier color palettes + animated glow helper
- `js/shared/skillRegistry.js` — unified skill metadata (categories, icons, colors)
- `js/shared/partyData.js` — party/bot tuning constants
- `js/shared/fishingData.js` — rod tiers, fish species, fishing timing/formula config
- `js/shared/farmingData.js` — hoes, crops, farming config, land expansions
- `js/shared/mafiaRoleData.js` — Mafia role definitions, default chances, assignment logic
- `js/shared/mafiaGameData.js` — Mafia match config, vision, sabotage, map data
- `js/shared/hideSeekData.js` — Hide & Seek round timers and config

---

## Armor Visuals

### Purpose
Defines per-tier color palettes (primary/secondary/dark/highlight + per-piece accents) for armor rendering, plus an animated glow helper used by tiers with `glow` data. Pure data + one helper, no game logic.

### Values

| Tier | Field | Value | Citation |
|------|-------|-------|----------|
| 1 Leather | name | "Leather" | js/shared/armorVisuals.js:11 |
| 1 | primary | #6a5030 | js/shared/armorVisuals.js:12 |
| 1 | secondary | #7a6040 | js/shared/armorVisuals.js:13 |
| 1 | dark | #5a4028 | js/shared/armorVisuals.js:14 |
| 1 | darker | #3a2a18 | js/shared/armorVisuals.js:15 |
| 1 | highlight | #7a6040 | js/shared/armorVisuals.js:16 |
| 1 | belt | #5a4020 | js/shared/armorVisuals.js:17 |
| 1 | accent | null | js/shared/armorVisuals.js:18 |
| 1 | glow | null | js/shared/armorVisuals.js:19 |
| 1 | animSpeed | 0 | js/shared/armorVisuals.js:20 |
| 2 Iron | primary | #4a5a64 | js/shared/armorVisuals.js:26 |
| 2 | secondary | #6a7a84 | js/shared/armorVisuals.js:27 |
| 2 | dark | #3a4a54 | js/shared/armorVisuals.js:28 |
| 2 | highlight | #5a6a74 | js/shared/armorVisuals.js:29 |
| 2 | accent | #8a9aa4 | js/shared/armorVisuals.js:30 |
| 2 | bootStripe | #7a8a94 | js/shared/armorVisuals.js:31 |
| 2 | glow | null | js/shared/armorVisuals.js:32 |
| 2 | animSpeed | 0 | js/shared/armorVisuals.js:33 |
| 3 Warden | primary | #3a4a3a | js/shared/armorVisuals.js:39 |
| 3 | secondary | #4a5a4a | js/shared/armorVisuals.js:40 |
| 3 | dark | #2a3a2a | js/shared/armorVisuals.js:41 |
| 3 | highlight | #5a6a5a | js/shared/armorVisuals.js:42 |
| 3 | emberEmblem | #8a6030 | js/shared/armorVisuals.js:43 |
| 3 | glow.color | [220,140,50] | js/shared/armorVisuals.js:44 |
| 3 | glow.baseAlpha | 0.3 | js/shared/armorVisuals.js:44 |
| 3 | glow.amplitude | 0.15 | js/shared/armorVisuals.js:44 |
| 3 | animSpeed | 0.005 | js/shared/armorVisuals.js:45 |
| 4 Void | primary | #1a1020 | js/shared/armorVisuals.js:51 |
| 4 | secondary | #2a1a30 | js/shared/armorVisuals.js:52 |
| 4 | dark | #1a1020 | js/shared/armorVisuals.js:53 |
| 4 | highlight | #2a1a30 | js/shared/armorVisuals.js:54 |
| 4 | voidCore | #3a1a4a | js/shared/armorVisuals.js:55 |
| 4 | bootSole | #0a0810 | js/shared/armorVisuals.js:56 |
| 4 | glow.color | [140,50,220] | js/shared/armorVisuals.js:57 |
| 4 | glow.baseAlpha | 0.4 | js/shared/armorVisuals.js:57 |
| 4 | glow.amplitude | 0.2 | js/shared/armorVisuals.js:57 |
| 4 | animSpeed | 0.006 | js/shared/armorVisuals.js:58 |
| 4 | shimmer | [180,100,255] | js/shared/armorVisuals.js:60 |
| 4 | coreGlow | [180,80,255] | js/shared/armorVisuals.js:61 |
| 4 | eyeGlow | [160,60,255] | js/shared/armorVisuals.js:62 |

### Behavior
1. `tierGlow(tier, time, speedOverride)` returns 0 if tier has no glow (js/shared/armorVisuals.js:77).
2. Speed = `speedOverride || tv.animSpeed` (js/shared/armorVisuals.js:78).
3. Alpha = `glow.baseAlpha + sin(time*speed) * glow.amplitude` (js/shared/armorVisuals.js:79).

### Dependencies
- Reads: none.
- Writes: none. Consumed by armor renderer code (out of cluster).

### Edge cases
- Tiers 1 & 2 have `glow:null` → `tierGlow` returns 0 unconditionally (js/shared/armorVisuals.js:77).
- Tier 4 has extra per-piece glow color arrays (`shimmer`, `coreGlow`, `eyeGlow`) not used by `tierGlow` (js/shared/armorVisuals.js:60-62).

---

## Skill Registry

### Purpose
Single source of truth for all skill categories, the skills under each, and their icons/colors. Other consumers read derived lookups (`SKILL_CATEGORIES`, `SKILL_ICONS`, `SKILL_COLORS`, `CAT_COLORS`, `CAT_ICONS`, `ALL_SKILLS`) built at load time.

### Values

| Category | Color | Icon | Citation |
|---|---|---|---|
| Killing | #e05050 | 💀 | js/shared/skillRegistry.js:9 |
| Sparring | #60c0e0 | 🔫 | js/shared/skillRegistry.js:26 |
| Basing | #c08040 | 🏠 | js/shared/skillRegistry.js:37 |
| Dungeons | #7080e0 | 🏰 | js/shared/skillRegistry.js:46 |
| Events | #ffc040 | 🏆 | js/shared/skillRegistry.js:61 |
| Jobs | PALETTE.accent or #60c0a0 | 💼 | js/shared/skillRegistry.js:80 |

| Category | Skills (count) | Citation |
|---|---|---|
| Killing | 12 | js/shared/skillRegistry.js:10-23 |
| Sparring | 6 | js/shared/skillRegistry.js:27-34 |
| Basing | 4 | js/shared/skillRegistry.js:38-43 |
| Dungeons | 10 | js/shared/skillRegistry.js:47-58 |
| Events | 14 | js/shared/skillRegistry.js:62-77 |
| Jobs | 10 | js/shared/skillRegistry.js:81-92 |

Per-skill icon/color rows are defined inline at the cited lines (js/shared/skillRegistry.js:11-22, 28-33, 39-42, 48-57, 63-76, 82-91).

### Behavior
1. At load, iterate `SKILL_REGISTRY` (js/shared/skillRegistry.js:104).
2. Populate `SKILL_CATEGORIES[cat]` with array of skill names (js/shared/skillRegistry.js:106).
3. Populate `CAT_COLORS[cat]`, `CAT_ICONS[cat]` (js/shared/skillRegistry.js:107-108).
4. For each skill, fill `SKILL_ICONS`, `SKILL_COLORS`, push to `ALL_SKILLS` (js/shared/skillRegistry.js:110-112).

### Dependencies
- Reads: `PALETTE.accent` from itemData.js if defined (js/shared/skillRegistry.js:80).
- Writes: `SKILL_CATEGORIES`, `SKILL_ICONS`, `SKILL_COLORS`, `CAT_COLORS`, `CAT_ICONS`, `ALL_SKILLS` globals (js/shared/skillRegistry.js:97-102).

### Edge cases
- `Jobs` color falls back to `#60c0a0` only when `PALETTE` is undefined at load time (js/shared/skillRegistry.js:80) — so script load order matters.

---

## Party Data

### Purpose
Tuning constants for the always-on dungeon party system: party size, bot AI ranges/cooldowns, wave scaling per member, and bot cosmetic presets.

### Values

| Name | Value | Units | Citation |
|---|---|---|---|
| MAX_SIZE | 4 | members | js/shared/partyData.js:6 |
| REVIVE_BASE_COST | 50 | gold | js/shared/partyData.js:8 |
| REVIVE_SHOP_DURATION | 600 | frames (10s) | js/shared/partyData.js:10 |
| BOT_HP_MULT | 3 | × player maxHp | js/shared/partyData.js:12 |
| BOT_DMG_MULT | 1 | × | js/shared/partyData.js:14 |
| BOT_SHOOT_CD | 10 | frames | js/shared/partyData.js:16 |
| BOT_MELEE_CD | 20 | frames | js/shared/partyData.js:18 |
| BOT_FOLLOW_MIN | 80 | px | js/shared/partyData.js:20 |
| BOT_FOLLOW_MAX | 150 | px | js/shared/partyData.js:21 |
| BOT_ENGAGE_RANGE | 250 | px | js/shared/partyData.js:23 |
| BOT_FLEE_THRESHOLD | 0.15 | fraction maxHp | js/shared/partyData.js:25 |
| BOT_EFFECTIVE_RANGE | 140 | px | js/shared/partyData.js:27 |
| BOT_SEPARATION_DIST | 60 | px | js/shared/partyData.js:29 |
| BOT_SPREAD_RADIUS | 70 | px | js/shared/partyData.js:31 |
| MOB_RETARGET_INTERVAL | 30 | frames | js/shared/partyData.js:33 |
| MOB_COUNT_SCALE_PER_MEMBER | 1.0 | × | js/shared/partyData.js:35 |
| MOB_HP_SCALE_PER_MEMBER | 0.5 | × | js/shared/partyData.js:36 |

Bot cosmetic presets (`BOT_PRESETS`):

| Slot | Name | skin | hair | shirt | pants | eyes | shoes | hat | Citation |
|---|---|---|---|---|---|---|---|---|---|
| 0 | (player) | null | — | — | — | — | — | — | js/shared/partyData.js:41 |
| 1 | Bot 1 | #c8a888 | #3a2a1a | #2a4a8a | #2a2a3a | #44aa66 | #3a2a1a | #2a4a8a | js/shared/partyData.js:42-46 |
| 2 | Bot 2 | #b89878 | #8a4a2a | #8a2a2a | #3a2a2a | #aa6644 | #4a3a2a | #8a2a2a | js/shared/partyData.js:47-51 |
| 3 | Bot 3 | #d4c4a8 | #1a1a2a | #2a6a4a | #2a3a2a | #4466aa | #2a2a1a | #2a6a4a | js/shared/partyData.js:52-56 |

### Behavior
- Pure data file. Consumers (`partySystem.js`, `botAI.js`) read these constants for AI decisions and wave scaling.

### Dependencies
- Reads: none.
- Writes: none.

### Edge cases
- Slot 0 is null because slot 0 is the player (js/shared/partyData.js:41).
- Comment notes scaling assumes "duo 2x, trio 3x, quad 4x" mob count (js/shared/partyData.js:35).

---

## Fishing Data

### Purpose
Defines rod tiers, fish species and their spawn/escape stats, all timing/tension constants for the fishing minigame, and helper functions for spawn-table picking and catch-chance calculation.

### Values — Rod tiers

| Field | bronze_rod | iron_rod | gold_rod | mythic_rod | Citation |
|---|---|---|---|---|---|
| tier | 0 | 1 | 2 | 3 | js/shared/fishingData.js:10-17 |
| levelReq | 1 | 5 | 12 | 25 | js/shared/fishingData.js:10-17 |
| cost | 20 | 80 | 200 | 500 | js/shared/fishingData.js:10-17 |
| durability | 25 | 40 | 60 | 100 | js/shared/fishingData.js:10-17 |
| strength | 1 | 2 | 3 | 5 | js/shared/fishingData.js:10-17 |
| catchBonus | 0.00 | 0.10 | 0.20 | 0.35 | js/shared/fishingData.js:10-17 |
| damage | 8 | 12 | 16 | 22 | js/shared/fishingData.js:11-17 |
| range | 80 | 85 | 90 | 95 | js/shared/fishingData.js:11-17 |
| cooldown | 34 | 30 | 26 | 22 | js/shared/fishingData.js:11-17 |
| critChance | 0 | 0.05 | 0.08 | 0.12 | js/shared/fishingData.js:11-17 |
| color | #8a6a3a | #8a8a8a | #ffd700 | #d4a030 | js/shared/fishingData.js:11-17 |

### Values — Fish species

| Fish | rarity | sellPrice | difficulty | minRodTier | xp | weight | color | Citation |
|---|---|---|---|---|---|---|---|---|
| sardine | 40 | 3 | 0.20 | 0 | 5 | 1 | #8ab4c8 | js/shared/fishingData.js:26 |
| bass | 25 | 8 | 0.35 | 0 | 10 | 2 | #5a8a5a | js/shared/fishingData.js:27 |
| salmon | 18 | 15 | 0.50 | 1 | 18 | 2 | #d08060 | js/shared/fishingData.js:28 |
| tuna | 10 | 25 | 0.65 | 1 | 30 | 3 | #4060a0 | js/shared/fishingData.js:29 |
| swordfish | 5 | 50 | 0.80 | 2 | 50 | 4 | #607090 | js/shared/fishingData.js:30 |
| Golden Leviathan | 2 | 120 | 0.95 | 3 | 100 | 5 | #d4a030 | js/shared/fishingData.js:31 |

### Values — FISHING_CONFIG

| Name | Value | Units | Citation |
|---|---|---|---|
| castFrames | 60 | frames (1.0s) | js/shared/fishingData.js:36 |
| waitFramesMin | 180 | frames (3.0s) | js/shared/fishingData.js:37 |
| waitFramesMax | 480 | frames (8.0s) | js/shared/fishingData.js:38 |
| biteWindowFrames | 120 | frames (2.0s) | js/shared/fishingData.js:39 |
| reelFramesMin | 180 | frames (3.0s) | js/shared/fishingData.js:40 |
| reelFramesMax | 360 | frames (6.0s) | js/shared/fishingData.js:41 |
| resultFrames | 90 | frames (1.5s) | js/shared/fishingData.js:42 |
| cooldownFrames | 60 | frames (1.0s) | js/shared/fishingData.js:43 |
| tensionDecayRate | 0.004 | per frame | js/shared/fishingData.js:45 |
| tensionFillRate | 0.006 | per frame | js/shared/fishingData.js:47 |
| tensionCatchThreshold | 0.45 | progress | js/shared/fishingData.js:49 |
| sweetSpotMin | 0.2 | tension | js/shared/fishingData.js:51 |
| sweetSpotMax | 0.85 | tension | js/shared/fishingData.js:52 |
| reelProgressBase | 0.005 | per frame | js/shared/fishingData.js:54 |
| reelProgressEasyBonus | 0.0025 | per frame | js/shared/fishingData.js:56 |
| fishFightBack | 0.0006 | per frame | js/shared/fishingData.js:58 |
| maxLevelBonus | 0.25 | cap | js/shared/fishingData.js:60 |
| levelBonusPerLevel | 0.005 | per level | js/shared/fishingData.js:61 |
| maxLineDistance | 160 | px | js/shared/fishingData.js:63 |
| overweightPenalty | 0.25 | per overweight | js/shared/fishingData.js:65 |

### Behavior
1. `getFishingSpawnTable(rodTier)` builds `[{fish,weight}]` array including only fish with `minRodTier <= rodTier` (js/shared/fishingData.js:71-80).
2. `pickRandomFish(rodTier)` does weighted random pick across the spawn table; returns last entry on rounding fallthrough (js/shared/fishingData.js:83-94).
3. `calculateCatchChance(fish, rod, fishingLevel)`:
   - `baseCatch = 1 - fish.difficulty` (js/shared/fishingData.js:99)
   - `+ rod.catchBonus` (js/shared/fishingData.js:100)
   - `+ min(maxLevelBonus, fishingLevel * levelBonusPerLevel)` (js/shared/fishingData.js:101)
   - `- max(0, fish.weight - rod.strength) * overweightPenalty` (js/shared/fishingData.js:102)
   - Clamp to [0.05, 0.95] (js/shared/fishingData.js:104).

### Dependencies
- Reads: none.
- Writes: none. Consumed by `fishingSystem.js`.

### Edge cases
- Catch chance is hard-clamped to [0.05, 0.95] — guarantees neither auto-catch nor auto-fail (js/shared/fishingData.js:104).
- Mythic Leviathan still has weight 5 vs Mythic Rod strength 5 → no overweight penalty exactly at parity (js/shared/fishingData.js:17, 31).

---

## Farming Data

### Purpose
Hoes (tools), crop definitions, farming cooldowns, and land expansion grid sizes. Helpers expose unlocked crops and current land tile counts.

### Values — Hoe tiers

| Field | bronze_hoe | iron_hoe | gold_hoe | mythic_hoe | Citation |
|---|---|---|---|---|---|
| tier | 0 | 1 | 2 | 3 | js/shared/farmingData.js:11-14 |
| levelReq | 1 | 5 | 12 | 25 | js/shared/farmingData.js:11-14 |
| cost | 20 | 80 | 200 | 500 | js/shared/farmingData.js:11-14 |
| reach | 1 | 1 | 2 | 2 | js/shared/farmingData.js:11-14 |
| cooldown | 36 | 30 | 24 | 20 | js/shared/farmingData.js:11-14 |
| swingTiles | 2 | 3 | 5 | 8 | js/shared/farmingData.js:11-14 |
| color | #8a6a3a | #8a8a8a | #ffd700 | #d4a030 | js/shared/farmingData.js:11-14 |

### Values — Bucket

| Name | Value | Citation |
|---|---|---|
| id | metal_bucket | js/shared/farmingData.js:19 |
| cost | 50 | js/shared/farmingData.js:19 |
| levelReq | 1 | js/shared/farmingData.js:19 |
| color | #7a8a9a | js/shared/farmingData.js:20 |

### Values — Crops

| Crop | growthFrames | seedCost | sellPrice | xp | levelReq | gardenReq | color | Citation |
|---|---|---|---|---|---|---|---|---|
| carrot | 900 | 5 | 12 | 8 | 1 | 0 | #e07830 | js/shared/farmingData.js:30 |
| potato | 1200 | 8 | 18 | 12 | 3 | 0 | #c0a060 | js/shared/farmingData.js:31 |
| tomato | 1500 | 12 | 25 | 18 | 6 | 0 | #dd3030 | js/shared/farmingData.js:32 |
| corn | 1800 | 15 | 35 | 25 | 10 | 1 | #e0d040 | js/shared/farmingData.js:33 |
| pumpkin | 2400 | 20 | 50 | 35 | 15 | 1 | #d08020 | js/shared/farmingData.js:34 |
| watermelon | 3000 | 30 | 70 | 45 | 20 | 1 | #40a040 | js/shared/farmingData.js:35 |
| sunflower | 3600 | 40 | 95 | 60 | 28 | 2 | #f0c020 | js/shared/farmingData.js:36 |
| starfruit | 4800 | 60 | 140 | 80 | 35 | 2 | #e0d060 | js/shared/farmingData.js:37 |
| dragonfruit | 6000 | 100 | 220 | 120 | 45 | 2 | #e040a0 | js/shared/farmingData.js:38 |

### Values — Farming config

| Name | Value | Units | Citation |
|---|---|---|---|
| PLOT_SIZE | 1 | tiles (48px) | js/shared/farmingData.js:42 |
| tillCooldown | 15 | frames (0.25s) | js/shared/farmingData.js:45 |
| plantCooldown | 10 | frames (0.17s) | js/shared/farmingData.js:46 |
| harvestCooldown | 15 | frames (0.25s) | js/shared/farmingData.js:47 |
| growthCheckInterval | 1 | frames | js/shared/farmingData.js:49 |
| tileInteractRange | 60 | px | js/shared/farmingData.js:51 |

### Values — Land expansions

| level | name | gridW | gridH | cost | levelReq | Citation |
|---|---|---|---|---|---|---|
| 0 | Starter Garden | 3 | 3 | 0 | 1 | js/shared/farmingData.js:59 |
| 1 | Small Garden | 5 | 4 | 250 | 5 | js/shared/farmingData.js:60 |
| 2 | Medium Garden | 8 | 5 | 800 | 12 | js/shared/farmingData.js:61 |
| 3 | Large Garden | 11 | 7 | 2000 | 20 | js/shared/farmingData.js:62 |
| 4 | Grand Garden | 16 | 9 | 4000 | 30 | js/shared/farmingData.js:63 |
| 5 | Vast Garden | 22 | 11 | 7000 | 45 | js/shared/farmingData.js:64 |
| 6 | Huge Garden | 28 | 14 | 12000 | 65 | js/shared/farmingData.js:65 |
| 7 | Maximum Garden | 36 | 16 | 20000 | 85 | js/shared/farmingData.js:66 |

### Behavior
1. `getUnlockedCrops(level)` returns all `CROP_TYPES` with `levelReq <= level` (js/shared/farmingData.js:71-79).
2. `getUnlockedTileCount(landLevel)` clamps index to LAND_EXPANSIONS length, returns `gridW*gridH` (js/shared/farmingData.js:82-86).
3. `getLandExpansion(landLevel)` clamps index and returns the expansion entry (js/shared/farmingData.js:89-92).

### Dependencies
- Reads: none.
- Writes: none. Consumed by `farmingSystem.js`.

### Edge cases
- Farm zone fits exactly into max expansion (36×16 = 576 plots) per comment (js/shared/farmingData.js:55-57).
- All crops have exactly 4 growth visual stages by convention (js/shared/farmingData.js:24).

---

## Mafia Role Data

### Purpose
Defines all 7 Mafia subroles (4 crewmate, 3 impostor) with per-role cooldown/duration settings, default chance percentages, and the `assignRoles()` function that turns a list of participants into impostors + crewmates with subroles.

### Values — Roles

| Role | team | color | Citation |
|---|---|---|---|
| engineer | crewmate | #f5a623 | js/shared/mafiaRoleData.js:7-12 |
| tracker | crewmate | #4ac9e3 | js/shared/mafiaRoleData.js:18-23 |
| noisemaker | crewmate | #e8d44d | js/shared/mafiaRoleData.js:29-34 |
| scientist | crewmate | #7ed321 | js/shared/mafiaRoleData.js:39-44 |
| shapeshifter | impostor | #bd10e0 | js/shared/mafiaRoleData.js:52-57 |
| phantom | impostor | #6a0dad | js/shared/mafiaRoleData.js:63-68 |
| viper | impostor | #d0021b | js/shared/mafiaRoleData.js:74-79 |

### Values — Per-role settings (default / min / max / step / unit)

| Role | Setting | default | min | max | step | unit | Citation |
|---|---|---|---|---|---|---|---|
| engineer | ventCooldown | 15 | 0 | 60 | 5 | s | js/shared/mafiaRoleData.js:14 |
| engineer | ventDuration | 30 | 5 | 120 | 5 | s | js/shared/mafiaRoleData.js:15 |
| tracker | trackDuration | 15 | 5 | 60 | 5 | s | js/shared/mafiaRoleData.js:25 |
| tracker | trackCooldown | 30 | 10 | 120 | 5 | s | js/shared/mafiaRoleData.js:26 |
| noisemaker | alertDuration | 10 | 3 | 30 | 1 | s | js/shared/mafiaRoleData.js:36 |
| scientist | vitalsDuration | 15 | 5 | 60 | 5 | s | js/shared/mafiaRoleData.js:46 |
| scientist | vitalsCooldown | 30 | 10 | 120 | 5 | s | js/shared/mafiaRoleData.js:47 |
| shapeshifter | shiftDuration | 20 | 5 | 60 | 5 | s | js/shared/mafiaRoleData.js:59 |
| shapeshifter | shiftCooldown | 30 | 10 | 120 | 5 | s | js/shared/mafiaRoleData.js:60 |
| phantom | invisDuration | 10 | 3 | 30 | 1 | s | js/shared/mafiaRoleData.js:70 |
| phantom | invisCooldown | 25 | 10 | 60 | 5 | s | js/shared/mafiaRoleData.js:71 |
| viper | dissolveTime | 30 | 10 | 120 | 5 | s | js/shared/mafiaRoleData.js:81 |

### Values — Default chances (`MAFIA_ROLE_DEFAULTS`)

| Key | Value | Citation |
|---|---|---|
| engineerChance | 30 | js/shared/mafiaRoleData.js:88 |
| trackerChance | 20 | js/shared/mafiaRoleData.js:89 |
| noisemakerChance | 20 | js/shared/mafiaRoleData.js:90 |
| scientistChance | 20 | js/shared/mafiaRoleData.js:91 |
| shapeshifterChance | 30 | js/shared/mafiaRoleData.js:92 |
| phantomChance | 20 | js/shared/mafiaRoleData.js:93 |
| viperChance | 20 | js/shared/mafiaRoleData.js:94 |

### Behavior — `assignRoles(participants, impostorCount)`
1. Default impostorCount = 1 (js/shared/mafiaRoleData.js:126).
2. Filter to bots only (player can't be impostor in single-player) and shuffle (js/shared/mafiaRoleData.js:129-130).
3. Reset all participants to crewmate, subrole=null (js/shared/mafiaRoleData.js:133-136).
4. Mark `min(count, bots.length)` shuffled bots as impostor (js/shared/mafiaRoleData.js:139-142).
5. Build impostor role candidates from `MAFIA_ROLE_SETTINGS` filtered to chance>0 (js/shared/mafiaRoleData.js:158-162).
6. For each impostor, roll [0,100): if `roll < sum(chances)`, weighted-pick a subrole (js/shared/mafiaRoleData.js:164-174).
7. Same procedure for crewmate subroles (engineer/tracker/noisemaker/scientist) (js/shared/mafiaRoleData.js:177-192).
8. `weightedPick` sums chances and picks proportionally; returns last on fallthrough (js/shared/mafiaRoleData.js:145-155).

`MAFIA_ROLE_SETTINGS` is built at load by copying chance defaults plus each role's setting defaults into one flat object (js/shared/mafiaRoleData.js:99-113).

### Dependencies
- Reads: none.
- Writes: `participants[].role`, `participants[].subrole`.

### Edge cases
- Total subrole chance can exceed 100 (e.g. crewmate sum = 30+20+20+20 = 90, but `roll < totalChance` works because roll is in [0,100)) — at sum >100 every crewmate always gets a subrole (js/shared/mafiaRoleData.js:188-191).
- Player is never an impostor — only bots (js/shared/mafiaRoleData.js:128).

---

## Mafia Game Data

### Purpose
Match-level config for the Mafia mode: bot count, vision radius, kill/meeting/sabotage timers, color/name palette, sabotage panels, default lobby settings, and per-map room/spawn data for skeld_01.

### Values — Match config

| Name | Value | Units | Citation |
|---|---|---|---|
| BOT_COUNT | 8 | bots | js/shared/mafiaGameData.js:8 |
| IMPOSTOR_COUNT | 1 | impostors | js/shared/mafiaGameData.js:9 |
| BOT_SPEED | GAME_CONFIG.PLAYER_BASE_SPEED | px/frame | js/shared/mafiaGameData.js:10 |
| FOV_BASE_RADIUS | 4.5 | tiles | js/shared/mafiaGameData.js:13 |
| KILL_RANGE | 120 | px | js/shared/mafiaGameData.js:16 |
| KILL_COOLDOWN | 1800 | frames (30s) | js/shared/mafiaGameData.js:17 |
| DISCUSSION_TIME | 900 | frames (15s) | js/shared/mafiaGameData.js:18 |
| VOTING_TIME | 1800 | frames (30s) | js/shared/mafiaGameData.js:19 |
| EJECTION_TIME | 300 | frames (5s) | js/shared/mafiaGameData.js:20 |
| VOTE_RESULTS_TIME | 900 | frames (15s) | js/shared/mafiaGameData.js:21 |
| REPORT_RANGE | 150 | px | js/shared/mafiaGameData.js:22 |
| EMERGENCY_RANGE | 120 | px | js/shared/mafiaGameData.js:23 |
| SABOTAGE_COOLDOWN | 1800 | frames (30s) | js/shared/mafiaGameData.js:24 |
| REACTOR_TIMER | 1800 | frames (30s) | js/shared/mafiaGameData.js:25 |
| O2_TIMER | 1800 | frames (30s) | js/shared/mafiaGameData.js:26 |
| BOT_TASK_PAUSE_MIN | 180 | frames (3s) | js/shared/mafiaGameData.js:29 |
| BOT_TASK_PAUSE_MAX | 300 | frames (5s) | js/shared/mafiaGameData.js:30 |
| BOT_PATH_LIMIT | 8000 | BFS nodes | js/shared/mafiaGameData.js:31 |
| RETURN_LEVEL | 'mafia_lobby' | — | js/shared/mafiaGameData.js:34 |
| RETURN_TX | 25 | tile | js/shared/mafiaGameData.js:35 |
| RETURN_TY | 20 | tile | js/shared/mafiaGameData.js:36 |

### Values — COLORS (10)

| Index | Name | body | dark | Citation |
|---|---|---|---|---|
| 0 | Red | #c51111 | #7a0838 | js/shared/mafiaGameData.js:40 |
| 1 | Blue | #132ed1 | #09158e | js/shared/mafiaGameData.js:41 |
| 2 | Green | #127f2d | #0a4d2e | js/shared/mafiaGameData.js:42 |
| 3 | Pink | #ed54ba | #ab2bad | js/shared/mafiaGameData.js:43 |
| 4 | Orange | #ef7d0e | #b33e15 | js/shared/mafiaGameData.js:44 |
| 5 | Yellow | #f5f557 | #c38823 | js/shared/mafiaGameData.js:45 |
| 6 | Black | #3f474e | #1e1f26 | js/shared/mafiaGameData.js:46 |
| 7 | White | #d6e0f0 | #8394bf | js/shared/mafiaGameData.js:47 |
| 8 | Purple | #6b2fbb | #3b177c | js/shared/mafiaGameData.js:48 |
| 9 | Cyan | #38fedb | #24a8a6 | js/shared/mafiaGameData.js:49 |

`BOT_NAMES` mirrors color names (js/shared/mafiaGameData.js:53-55).

### Values — Sabotage types

| Key | timer | label | fixPanels | simultaneous | Citation |
|---|---|---|---|---|---|
| reactor_meltdown | 1800 | Reactor Meltdown | reactor_p1, reactor_p2 | true | js/shared/mafiaGameData.js:59-63 |
| o2_depletion | 1800 | O2 Depleted | o2_o2, o2_admin | false | js/shared/mafiaGameData.js:64-68 |
| lights_out | 0 (no timer) | Lights Out | lights_electrical | false | js/shared/mafiaGameData.js:69-73 |

### Values — Sabotage panels (tile coords)

| Panel | tx | ty | Citation |
|---|---|---|---|
| reactor_p1 | 6 | 25 | js/shared/mafiaGameData.js:79 |
| reactor_p2 | 6 | 44 | js/shared/mafiaGameData.js:80 |
| o2_o2 | 99 | 32 | js/shared/mafiaGameData.js:81 |
| o2_admin | 92 | 38 | js/shared/mafiaGameData.js:82 |
| lights_electrical | 41 | 55 | js/shared/mafiaGameData.js:83 |

### Values — Settings defaults

| Key | Value | Citation |
|---|---|---|
| impostors | 1 | js/shared/mafiaGameData.js:90 |
| killCooldown | 30 s | js/shared/mafiaGameData.js:91 |
| killDistance | 'Medium' | js/shared/mafiaGameData.js:92 |
| playerSpeed | 1 | js/shared/mafiaGameData.js:93 |
| discussionTime | 15 s | js/shared/mafiaGameData.js:95 |
| votingTime | 30 s | js/shared/mafiaGameData.js:96 |
| emergencyMeetings | 1 | js/shared/mafiaGameData.js:97 |
| emergencyCooldown | 15 s | js/shared/mafiaGameData.js:98 |
| confirmEjects | true | js/shared/mafiaGameData.js:99 |
| anonymousVotes | false | js/shared/mafiaGameData.js:100 |
| commonTasks | 1 | js/shared/mafiaGameData.js:102 |
| longTasks | 1 | js/shared/mafiaGameData.js:103 |
| shortTasks | 2 | js/shared/mafiaGameData.js:104 |
| taskBarUpdates | 'Always' | js/shared/mafiaGameData.js:105 |
| crewVision | 1 | js/shared/mafiaGameData.js:107 |
| impostorVision | 1.5 | js/shared/mafiaGameData.js:108 |
| map | 'skeld_01' | js/shared/mafiaGameData.js:110 |
| maxPlayers | 10 | js/shared/mafiaGameData.js:111 |

### Values — skeld_01 map

| Field | tx | ty | Citation |
|---|---|---|---|
| SPAWN | 74 | 18 | js/shared/mafiaGameData.js:118 |
| cafeteria | 74 | 17 | js/shared/mafiaGameData.js:120 |
| upper_engine | 16 | 9 | js/shared/mafiaGameData.js:121 |
| reactor | 6 | 35 | js/shared/mafiaGameData.js:122 |
| security | 34 | 33 | js/shared/mafiaGameData.js:123 |
| medbay | 49 | 25 | js/shared/mafiaGameData.js:124 |
| electrical | 50 | 52 | js/shared/mafiaGameData.js:125 |
| admin | 91 | 46 | js/shared/mafiaGameData.js:126 |
| storage | 70 | 66 | js/shared/mafiaGameData.js:127 |
| shields | 112 | 62 | js/shared/mafiaGameData.js:128 |
| communications | 92 | 73 | js/shared/mafiaGameData.js:129 |
| lower_engine | 16 | 60 | js/shared/mafiaGameData.js:130 |
| weapons | 109 | 9 | js/shared/mafiaGameData.js:131 |
| o2 | 96 | 29 | js/shared/mafiaGameData.js:132 |
| navigation | 127 | 34 | js/shared/mafiaGameData.js:133 |

### Behavior
1. At load, `MAFIA_SETTINGS` is cloned via `Object.assign({}, MAFIA_GAME.SETTINGS_DEFAULTS)` so the lobby UI can mutate without touching defaults (js/shared/mafiaGameData.js:140).
2. `mafiaPlayerColorIdx` initial = 0 (js/shared/mafiaGameData.js:143).
3. Phase order (consumed by mafia system, not this file): KILL_COOLDOWN governs impostor kill rate; meeting → DISCUSSION_TIME → VOTING_TIME → VOTE_RESULTS_TIME → EJECTION_TIME.

### Dependencies
- Reads: `GAME_CONFIG.PLAYER_BASE_SPEED` (js/shared/mafiaGameData.js:10).
- Writes: `MAFIA_SETTINGS` global, `mafiaPlayerColorIdx` global.

### Edge cases
- `lights_out.timer = 0` is intentional — sabotage stays until manually fixed (js/shared/mafiaGameData.js:70).
- Sabotage panel coords are in real grid space (after `XO=4` skeld offset already applied), per inline comments (js/shared/mafiaGameData.js:79, 81, 82, 83).
- Only one map (skeld_01) is registered (js/shared/mafiaGameData.js:117).

---

## Hide & Seek Data

### Purpose
Round timers, tag range, FOV, bot speed/detection, and return-to-lobby coordinates for the Hide & Seek mode.

### Values

| Name | Value | Units | Citation |
|---|---|---|---|
| HIDE_TIME | 1800 | frames (30s) | js/shared/hideSeekData.js:6 |
| SEEK_TIME | 1800 | frames (30s) | js/shared/hideSeekData.js:7 |
| POST_MATCH_TIME | 600 | frames (10s) | js/shared/hideSeekData.js:8 |
| TAG_RANGE | 90 | px | js/shared/hideSeekData.js:9 |
| FOV_RADIUS | 4.5 | tiles | js/shared/hideSeekData.js:10 |
| MAP_ID | 'hide_01' | — | js/shared/hideSeekData.js:11 |
| BOT_SPEED | PLAYER_BASE_SPEED * 0.75 | px/frame | js/shared/hideSeekData.js:12 |
| BOT_DETECT_RANGE | 3 | tiles | js/shared/hideSeekData.js:13 |
| RETURN_LEVEL | 'lobby_01' | — | js/shared/hideSeekData.js:14 |
| RETURN_TX | 17 | tile | js/shared/hideSeekData.js:15 |
| RETURN_TY | 22 | tile | js/shared/hideSeekData.js:16 |

### Behavior
1. Hide phase: hider can move; seeker is frozen for HIDE_TIME (js/shared/hideSeekData.js:6).
2. Seek phase: seeker moves with FOV_RADIUS vision; hider frozen for SEEK_TIME (js/shared/hideSeekData.js:7, 10).
3. After SEEK_TIME (or tag), POST_MATCH_TIME results screen plays before auto-return (js/shared/hideSeekData.js:8).
4. Tag detected at TAG_RANGE px = melee.range default (js/shared/hideSeekData.js:9).
5. Bot seekers detect hider at BOT_DETECT_RANGE tiles (js/shared/hideSeekData.js:13).
6. On return, scene is RETURN_LEVEL at (RETURN_TX, RETURN_TY) (js/shared/hideSeekData.js:14-16).

### Dependencies
- Reads: `GAME_CONFIG.PLAYER_BASE_SPEED` (js/shared/hideSeekData.js:12).
- Writes: none.

### Edge cases
- Win conditions: UNKNOWN — not encoded in this data file (consumed by hide & seek system code, out of cluster).
- Whether a tag during hide phase (seeker frozen) is possible: UNKNOWN here.
