# Unity Port Parity Audit & Fix Plan

> **Created**: 2026-03-27
> **Status**: IN PROGRESS — Track completion by checking boxes below

## Context
A full audit of ~120 Unity C# scripts against the JS source revealed **~70 mismatches** — 19 critical, 26 high, ~25 medium. These range from combat values being 4x wrong to entire subsystems (cosmetics, vendor data, input mapping) being architecturally different from JS. The root cause is consistent: values/logic were guessed or fabricated instead of being read from JS source files.

---

## A. FIX PLAN — By Priority Batch

### BATCH 1: Combat Core (Breaks all gameplay) — Status: DONE

- [x] **#1** Gun fire rate formula — `GunSystem.cs` — `(fireRate*4)/60f`
- [x] **#2** Reload time — `GunSystem.cs` — Ported `GetReloadTime()` (base 20+fireRate*0.25 frames, CT-X 1.2x)
- [x] **#3** Contact cooldown scope — `PlayerController.cs` — Only on "contact" source, projectile/AOE pass through
- [x] **#4** Backstab angle mapping — `DamageSystem.cs` — Fixed: down=-PI/2, left=PI, up=PI/2, right=0
- [x] **#5** Kill ammo refill — `GunSystem.cs` — Subscribes to mob_killed, refills mag + cancels reload
- [x] **#6** Melee crit per-mob — `MeleeSystem.cs` — Roll moved inside mob loop
- [x] **#7** Melee swing duration — `MeleeSystem.cs` — 12/60 = 0.2s
- [x] **#8** Melee knockback wall check — `MeleeSystem.cs` — Checks HasTile before applying
- [x] **#9** Bullet hit detection — `BulletSystem.cs` — Rect-vs-circle with HALF_LONG/SHORT
- [x] **#10** Bullet player hitbox Y offset — `BulletSystem.cs` — PLAYER_HITBOX_Y=-25px, MOB=-20px
- [x] **#11** Bullet lifetime model — `BulletSystem.cs` — Mob bullets use life countdown, player bullets unlimited

**JS source**: `gunSystem.js`, `meleeSystem.js`, `bulletSystem.js`, `mobSystem.js:1329-1385`, `damageSystem.js`

### BATCH 2: Wave System (Breaks dungeon balance) — Status: DONE

- [x] **#12** Damage mult floor indexing — `WaveSystem.cs` + `WaveScaling.cs` — `f = floor - 1` (0-indexed)
- [x] **#13** Phase mob spawning — `WaveSystem.cs` — Each phase spawns 100% of getMobCountForWave()
- [x] **#14** Phase trigger threshold — `WaveSystem.cs` — FloorToInt
- [x] **#15** Witch HP override — `WaveSystem.cs` — `tank.hp * 1.2 * hpMult`
- [x] **#16** Golem extra 1.5x HP — `WaveSystem.cs` — Additional 1.5x in SpawnMob
- [x] **#17** Tank/Witch/Golem scale — `WaveSystem.cs` SpawnMob — 1.3/1.1/1.6 visual scale
- [x] **#18** Default contactRange — `MobController.cs` — Fallback 76px
- [x] **#19** Player contact invuln — `PlayerController.cs` — Already correct: global 0.5s cooldown (CONTACT_CD=0.5f)
- [x] **#20** Mob unlock gating — `WaveSystem.cs` — IsMobUnlocked() with progressive wave thresholds (cave only)
- [x] **#21** Per-type mob caps — `WaveSystem.cs` — MOB_CAPS dict + typeCounts tracking
- [x] **#22** Boss medpacks — `WaveSystem.cs` — SpawnMedpacks() emits 2x spawn_medpack events
- [x] **#23** Duo boss support — `WaveSystem.cs` — comp.duoBoss field + FloorConfigRegistry.WaveComp
- [x] **#24** Farm wave multiplier — `WaveSystem.cs` — Cave waves 1,3 per 8-block: 1.6x count, 0.7x HP

**JS source**: `waveSystem.js:268-700`, `mobTypes.js`, `floorConfig.js`

### BATCH 3: Input Mapping (Breaks core controls) — Status: DONE

- [x] **#25** Arrow keys = shooting — `PlayerInputHandler.cs` — WASD only for movement, arrows for shooting
- [x] **#26** Dash key — `PlayerInputHandler.cs` — Shift (left/right)
- [x] **#27** Potion key — `PlayerInputHandler.cs` — Slot 3 (key "3")
- [x] **#28** shootPressed flag — `PlayerInputHandler.cs` — GetMouseButtonDown(0) on first frame
- [x] **#29** Missing input intents — `InputIntent.cs` — Added all missing fields
- [x] **#30** Settings keybind actions — `SettingsPanelUI.cs` — 17 correct actions from JS DEFAULT_KEYBINDS

**JS source**: `input.js`, `inputIntent.js`, `settings.js`, `panelManager.js`

### BATCH 4: Casino Payouts (Breaks economy) — Status: DONE

- [x] **#31** Roulette payout — `CasinoSystem.cs` — No ApplyEdge, raw bet+mult (zero provides edge)
- [x] **#32** Keno payout tables — `CasinoData.cs` — All 3 risk × 10 pick tables from JS
- [x] **#33** Slots payout — `CasinoSystem.cs` — `floor(bet*mult) + bet` (no edge, reel weights provide it)
- [x] **#34** Slots jackpot — `CasinoSystem.cs` — `jackpotPool + bet`
- [x] **#35** RPS payout — `CasinoSystem.cs` — `floor(bet * 1.90)` total (edge baked in)
- [x] **#36** Dice payout — `CasinoSystem.cs` — `floor(bet * payoutMult)` total (edge baked in DICE_PAYOUTS)
- [x] **#37** Dice payouts — `CasinoData.cs` — All 6 rows recomputed from JS formula, equal always 5.70
- [x] **#38** BJ natural BJ check — `CasinoSystem.cs` — BJCheckNaturals() called after deal
- [x] **#39** BJ double on bust — `CasinoSystem.cs` — SetLose directly, no dealer play
- [x] **#40** Coinflip game ID — `CasinoData.cs` — `headsOrTails`

**JS source**: `casinoSystem.js`, `casinoData.js`

### BATCH 5: Vendor Panel Data (All fabricated) — Status: NOT STARTED

- [ ] **#41** Pickaxe damage values — `MiningShopUI.cs` — All wrong (1-18) → (10-40) from interactable.js
- [ ] **#42** Pickaxe unlock system — `MiningShopUI.cs` — Gold+level → Ore-discovery unlock
- [ ] **#43** All crop sell prices — `FarmVendorUI.cs` — All wrong → Read farmingData.js
- [ ] **#44** All seed costs — `FarmVendorUI.cs` — Several wrong → Read farmingData.js
- [ ] **#45** Growth times — `FarmVendorUI.cs` — 2x too long → frames/60 from farmingData.js
- [ ] **#46** Land expansions — `FarmVendorUI.cs` — 7 wrong entries → Port all 8 from JS
- [ ] **#47** Hoe tier stats — `FarmVendorUI.cs` — Missing gameplay stats → Add from JS
- [ ] **#48** Rod combat stats — `FishVendorUI.cs` — Missing → Add damage/range/cooldown/etc
- [ ] **#49** Shop stock — `ShopPanelUI.cs` — Hardcoded → Build from PROG_ITEMS

**JS source**: `interactable.js:160-190`, `farmingData.js`, `fishingData.js`, `oreData.js`

### BATCH 6: Rendering & Cosmetics (Visual incorrectness) — Status: NOT STARTED

- [ ] **#50** Mob renderer — `MobRenderer.cs` — 32x32 circles → Full character renderer
- [ ] **#51** Mob AI-to-color mapping — `MobRenderer.cs` — Fabricated → Use MOB_TYPES skin/hair/shirt/pants
- [ ] **#52** Cosmetic system — `CosmeticPalette.cs` — Palette indices → Hex color strings
- [ ] **#53** Default cosmetics — Multiple — Wrong colors → skin=#d4bba8, hair=#0c0c10, etc.
- [ ] **#54** Head sprite dir remap — `CharacterRenderer.cs` — Same as body → dirToCol=[0,2,1,3]
- [ ] **#55** Missing pants/eyes palettes — `CosmeticPalette.cs` → Switch to hex string system
- [x] **#56** Party tier dot colors — `PartyStatusUI.cs` — #888/#5fca80/#4a9eff/#b060e0/#ffd700

**JS source**: `characterSprite.js`, `entityRenderers.js`, `gameState.js:38-42`, `cosmeticData.js`, `mobTypes.js`

### BATCH 7: Save/Load & Settings (Data loss) — Status: PARTIAL (4/11 done)

- [ ] **#57** Save toggle key names — `SaveManager.cs` — Wrong keys → Match JS exactly
- [ ] **#58** Settings key names — `SettingsPanelUI.cs` — `showNicknames` → `nicknames`
- [ ] **#59** Sounds: toggles not sliders — `SettingsPanelUI.cs` → Boolean toggles (ambient slider added)
- [ ] **#60** Missing hotbar position — `SettingsPanelUI.cs` → Add select: right/bottom (readonly added)
- [x] **#61** Privacy: 3 missing toggles — `SettingsPanelUI.cs` — Added privateStats, pmFriendsOnly, disableAllMessages
- [x] **#62** Profile: 3 missing selects — `SettingsPanelUI.cs` — Added language, currency, relationshipStatus
- [ ] **#63** Message chatVisibility — `SettingsPanelUI.cs` — Toggle → Select: All/Friends/None
- [x] **#64** Indicator defaults wrong — `SettingsPanelUI.cs` — mobHpText=false, showOwnHitbox=true
- [ ] **#65** Missing sparProgress save — `SaveData.cs` → Add fields
- [ ] **#66** Missing sparLearning save — `SaveData.cs` → Add fields
- [ ] **#67** Cosmetics save: 5→19 keys — `CustomizePanelUI.cs` → Track all 19

**JS source**: `saveLoad.js`, `settings.js`, `settingsUI.js`

### BATCH 8: Scene Manager & Remaining (Everything else) — Status: PARTIAL (5/16 done)

- [x] **#68** Missing 10 scenes — `SceneManager.cs` — Added all 18 scene types + InX accessors
- [x] **#69** Forge max level — `ForgePanelUI.cs` — 25
- [ ] **#70** Forge upgrade cost — `ForgePanelUI.cs` — Simplified → Port from PROG_ITEMS
- [ ] **#71** Forge stat scaling — `ForgePanelUI.cs` — +2% damage → getProgressedStats() interpolation
- [x] **#72** Party default melee — `PartyData.cs` — VERIFIED CORRECT: Combat Blade (24/110/24/0.15) matches current JS DEFAULT_MELEE. Audit agent found old backup fallback values.
- [x] **#73** Spar mag size — `SparSystem.cs` — 30
- [x] **#74** Spar bot CT-X builds — `SparSystem.cs` — META_BUILDS: {50,50,0}, {40,50,10}, {30,40,30}
- [ ] **#75** Neural obs wall Y swap — `NeuralSparInference.cs` — Inverted → Match JS
- [ ] **#76** Neural idle/shoot actions — `NeuralSparInference.cs` → Port exact JS movement
- [ ] **#77** Neural bullet Y offset — `NeuralSparInference.cs` → Add PLAYER_HITBOX_Y
- [ ] **#78** Mafia role assignment — `MafiaSystem.cs` — Always subrole → Allow null (10-30%)
- [ ] **#79** Mining first-hit delay — `MiningSystem.cs` — 70% → ~27% of tick
- [ ] **#80** Crafting gun materials — `CraftingSystem.cs` — Missing → Add upgradeMaterials
- [ ] **#81** DamageSystem mechanics — `DamageSystem.cs` → Frontal shield, counter, thorns, poison immune, armor break
- [ ] **#82** Healer AI ally-seeking — `MobAIPatterns.cs` → Port ally orbit
- [ ] **#83** Frost slow fallback — `MobStatusEffects.cs` — 0.25 → 0.3 in getter

---

## B. ROOT CAUSE ANALYSIS — Why Were These Wrong?

### Pattern 1: "I'll Just Use A Reasonable Value" (38 of 70 bugs — 55%)
**Examples**: All vendor prices, pickaxe stats, default melee stats, growth times, land expansions, cosmetic colors, tier dot colors, casino payouts
**Root cause**: Values were invented based on "what seems reasonable" instead of reading the JS source.
**Prevention**: NEVER invent numeric values — every number in Unity must have a traceable JS source line.

### Pattern 2: "The Formula Looks Right" (12 of 70 bugs — 17%)
**Examples**: Fire rate (missing *4 multiplier), reload time (hardcoded), damage mult (wrong floor indexing), phase mob count (invented split), forge stats (+2% instead of interpolation)
**Root cause**: JS formula was partially read but critical details were missed. Helper functions like `getFireRate()` or `getReloadTime()` were skipped.
**Prevention**: TRACE helper functions — if JS has `getFoo()`, read that function, don't use the raw field.

### Pattern 3: "I'll Build The Architecture My Way" (8 of 70 bugs — 11%)
**Examples**: Cosmetic palette indices (JS uses hex strings), pickaxe unlock system (JS uses ore discovery, Unity uses gold), phase mob spawning (invented 40/30/30 split)
**Root cause**: JS architecture was not studied before implementing. A different approach was designed from scratch.
**Prevention**: READ JS architecture first — before designing Unity equivalent, read how JS structures the system.

### Pattern 4: "Canvas vs Unity Coordinate Flip" (6 of 70 bugs — 9%)
**Examples**: Backstab angles, neural wall observations, arrow key direction, mob direction mapping
**Root cause**: JS uses canvas coords (Y-down), Unity uses Y-up. Conversions were forgotten or applied incorrectly.
**Prevention**: Y-axis conversion checklist for every direction, angle, or Y-coordinate.

### Pattern 5: "That Feature Probably Doesn't Exist" (6 of 70 bugs — 9%)
**Examples**: Kill ammo refill, boss medpacks, duo bosses, farm waves, mob unlock gating, per-type caps
**Root cause**: Features were never discovered because only the main code path was read, not edge cases or event handlers.
**Prevention**: READ entire JS file — not just the main function. Check event handlers, edge cases, helper functions, defaults.

---

## C. EXECUTION ORDER

1. **Batch 1 (Combat)** — 11 fixes. Most impactful.
2. **Batch 3 (Input)** — 6 fixes. Quick wins, huge UX impact.
3. **Batch 2 (Waves)** — 13 fixes. Dungeon balance.
4. **Batch 4 (Casino)** — 10 fixes. Economy.
5. **Batch 5 (Vendor Data)** — 9 fixes. All data replacement.
6. **Batch 6 (Rendering)** — 7 fixes. Visual correctness.
7. **Batch 7 (Save/Settings)** — 11 fixes. Data persistence.
8. **Batch 8 (Remaining)** — 16 fixes. Everything else.

**Total: 83 fixes across 8 batches.**

## D. VERIFICATION

For each batch:
1. Read the JS source file for EVERY value being changed
2. Verify the Unity value matches with sample calculations
3. Check Unity compiles after each batch
4. Cross-reference against parity mistake memory

After all batches:
- Full re-audit of changed files (spot-check 10 random values)
- Verify SceneType enum has all 18 scenes
- Verify input mapping matches JS keybinds exactly
- Verify casino payouts with bet=100 test cases
