# Sprite and Rendering Systems — Detailed Reference

This document covers every rendering subsystem in Teah Online for 1:1 Unity porting. All values are taken directly from the JS source files.

**Source files:**
- `js/client/rendering/characterSprite.js` — Character sprite system
- `js/client/rendering/entityRenderers.js` — Entity renderers
- `js/client/rendering/hitEffects.js` — Hit effect renderers
- `js/core/tileRenderer.js` — Tile/background rendering
- `js/core/assetLoader.js` — Asset loading pipeline
- `js/core/cameraSystem.js` — Security camera system
- `js/shared/armorVisuals.js` — Armor tier visuals

---

## Character Sprite System (characterSprite.js)

### 3-Layer System: Body, Head, Hat

Characters are rendered using 3 separate layers composited bottom-to-top:

1. **BODY** (base layer) — torso, arms, legs, feet
2. **HEAD** (middle layer) — face, hair, skin
3. **HAT** (top layer) — headwear, accessories

The runtime `drawLayeredSprite()` system uses **4 columns** (frames) x **4 rows** (directions) for all layers:
- Row 0 = Down, Row 1 = Up, Row 2 = Left, Row 3 = Right
- Col 0 = Idle, Col 1-3 = Walk frames (selected as `1 + (Math.floor(frame) % 3)`)

### LAYER_SIZES (per-frame dimensions for runtime rendering)

| Layer | Width | Height |
|-------|-------|--------|
| body  | 48    | 64     |
| head  | 48    | 48     |
| hat   | 48    | 48     |

Constants:
```
SPRITE_COLS = 4
SPRITE_ROWS = 4
DIR_TO_ROW = { 0: 0, 1: 1, 2: 2, 3: 3 }
```

**Note:** Art pipeline templates use different cell sizes (32x32 for body/head/hat) and different row counts (body 32 rows, head 4 rows, hat 5 rows). The runtime system and template system are separate.

### Head Sprite System (HEAD_REGISTRY)

Head spritesheets are 128x128 PNGs with 4 cols x 4 rows of 32x32 cells. These are loaded into `HEAD_REGISTRY` via `registerHead()` / `loadHeadSprites()`.

Column mapping for heads (different from body):
```
dirToCol = [0, 2, 1, 3]  // Down=col0, Up=col2, Left=col1, Right=col3
```

Head rows: Walk & Idle (row 0), Push (row 1), Pull (row 2), Hurt & Dying (row 3)

`drawSpriteHead(hx, hy, dir, headEntry, bobY)`:
- Draws a 32x32 cell scaled to 40x40 at position `(hx, hy - 6 + bobY)`
- Returns `true` if drawn, `false` if headEntry is invalid

### Color Utilities

```javascript
parseHex(hex)  // '#rrggbb' -> [r, g, b]
toHex(r, g, b) // [r, g, b] -> '#rrggbb', clamped 0-255

darkenColor(hex, factor)
  // r * factor, g * factor, b * factor

lightenColor(hex, factor)
  // r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor

skinShadow(hex, amount)
  // Warm shadow: r * (1 - amount*0.3), g * (1 - amount*0.4), b * (1 - amount*0.45)

skinHighlight(hex, amount)
  // Warm highlight: r + (255 - r)*amount, g + (245 - g)*amount*0.8, b + (230 - b)*amount*0.6
```

### Equipment Override System

Two global variables control how bots/NPCs render with custom equipment:

- `_charEquipOverride` — set to a bot's equip object before calling `drawChar()`, replaces `playerEquip`
- `_charColorOverride` — `{ skin, hair, shirt, pants }` for bots, replaces player color references

Both are set before `drawChar()` for party bots, cleared after.

### drawChar() Function

```javascript
drawChar(sx, sy, dir, frame, moving, skin, hair, shirt, pants, name, hp, isPlayer, mobType, maxHp, boneSwing, mobScale, castTimer)
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| sx, sy | number | World position (center-bottom of character) |
| dir | number | Direction: 0=down, 1=up, 2=left, 3=right |
| frame | number | Animation frame counter |
| moving | boolean | Whether character is walking |
| skin | string | Hex color for skin |
| hair | string | Hex color for hair |
| shirt | string | Hex color for shirt/torso |
| pants | string | Hex color for pants |
| name | string | Display name |
| hp | number | Current HP (-1 to skip HP bar) |
| isPlayer | boolean | Is this the local player or a party bot |
| mobType | string | Mob type key (e.g., 'skeleton', 'golem') |
| maxHp | number | Max HP for HP bar |
| boneSwing | number | Skeleton bone weapon swing angle |
| mobScale | number | Scale multiplier (default 1) |
| castTimer | number | Cast timer for casting animation |

**Rendering pipeline:**
1. **Mafia mode check** — If in Skeld or MafiaLobby, draws Among Us crewmate via `_drawCrewmateWorld()` instead
2. **Sprite mode check** — If `useSpriteMode` is true, tries `drawLayeredSprite()` first
3. **Hitbox circle** — Draws if `gameSettings.showOwnHitbox` / `showOtherHitbox` is enabled
4. **Character body** — Scales by `CHAR_SCALE (1.1) * mobScale`, then:
   - Player/partyBot: calls `drawChoso()`
   - Mobs: calls `drawGenericChar()`
5. **Name tag + HP bar** — Drawn at normal scale above character

**Scale:** `effectiveScale = CHAR_SCALE (1.1) * (mobScale || 1)`

### drawChoso() — Player/Bot Character

Renders the "Choso-style" player character with tier-aware armor visuals.

**Animation values:**
```javascript
bobY = moving ? Math.sin(frame * PI/2) * 2.5 : 0
legSwing = moving ? Math.sin(frame * PI/2) * 6 : 0
armSwing = moving ? Math.sin(frame * PI/2) * 5 : 0
```

**Body origin:** `x = sx - 20, y = sy - 68`

**Rendering order:**
1. Legs (pants) — tier-aware (T0-T4)
2. Boots — tier-aware (T0-T4)
3. Body (chest) — tier-aware (T0-T4)
4. Arms + Gun (rifle rendering with per-gun shapes)
5. Head + Hair
6. Helmet — tier-aware (T0-T4)

Armor tiers 0-4 use `ARMOR_VISUALS` colors and `tierGlow()` for animated effects.

### drawGenericChar() — Mob Characters

Renders non-player mobs with mob-type-specific visuals.

**Special mob type flags (each has custom rendering):**
- Standard: `skeleton`, `witch`, `golem`, `mini_golem`, `mummy`, `archer`, `healer`, `shooter`
- Azurine City (Floor 1): `neon_pickpocket`, `cyber_mugger`, `drone_lookout`, `street_chemist`, `renegade_bruiser`, `renegade_shadowknife`, `renegade_demo`, `renegade_sniper`, `the_don`, `velocity`
- Generic fallback for all other mobs

**Healer special:** Floats above ground with `floatOff = -12 + sin(renderTime * 0.003) * 5`

### Among Us Crewmate Renderer

`_drawCrewmateWorld(sx, sy, dir, frame, moving, bodyColor, darkColor, scale, isGhost)`:
- Scale: `(scale || 1) * 1.6`
- Ghost mode: `globalAlpha = 0.35`
- Direction: `facingLeft = dir === 2`, `facingBack = dir === 1`
- Walk animation: `walkAmt = moving ? sin(frame * PI/2) * 3 : 0`
- Visor color: `#a8d8ea`
- Visor shine: `rgba(255,255,255,0.35)`

Color lerp helper: `_lerpHexColor(a, b, t)` — linear interpolation between two hex colors

### drawNameTag()

```javascript
drawNameTag(sx, sy, hy, name, hp, isPlayer, maxHp, nameColorOverride)
```
- Skips if `name` is empty/null
- HP bar width: 44px
- HP bar position: `hy - 28`
- Skipped for deli NPCs (`hp < 0`) and Skeld scene

### Direction Mapping

```
0 = Down
1 = Up
2 = Left
3 = Right
```

---

## Entity Renderers (entityRenderers.js)

### Registry Structure

```javascript
const ENTITY_RENDERERS = {
  entityType: (e, ctx, ex, ey, w, h) => { ... },
};
```

**Parameters:**
| Parameter | Description |
|-----------|-------------|
| e | Entity object (has `.tx`, `.ty`, `.type`, `.variant`, `.w`, `.h`) |
| ctx | Canvas 2D rendering context |
| ex | Entity X position in screen space (e.tx * TILE - camX) |
| ey | Entity Y position in screen space (e.ty * TILE - camY) |
| w | Entity width in tiles (default 1) |
| h | Entity height in tiles (default 1) |

### Dispatch Function

```javascript
function drawLevelEntities(camX, camY) {
  for (const e of levelEntities) {
    // Skeld FOV check for tasks/sabotage
    const renderer = ENTITY_RENDERERS[e.type];
    if (renderer) renderer(e, ctx, ex, ey, w, h);
  }
}
```

### Complete Entity Type List (172 static types + dynamic ingredient types)

#### Core/Lobby (14 types)
| Type | Description |
|------|-------------|
| `spawnPad` | Red pulsing spawn pad circle |
| `barrierH` | Horizontal energy barrier (magenta) |
| `barrierV` | Vertical energy barrier (magenta) |
| `zone` | Subtle zone overlay (purple tint) |
| `path_v` | Vertical neon walkway with cyan edge strips |
| `path_h` | Horizontal neon walkway with cyan edge strips |
| `fountain` | Large cyberpunk fountain with holographic projection |
| `fence` | Metal fence with pointed pickets |
| `tree` | Neon crystal formation (3 variants: cyan spire, purple cluster, magenta arc) |
| `flower` | Bioluminescent light dots (4 neon colors) |
| `lamp` | Neon light post |
| `bench` | Bench |
| `table` | Table |
| `bush` | Bush |

#### Buildings — Exterior (15 types)
| Type | Description |
|------|-------------|
| `tower_exterior` | Tower exterior |
| `cave_entrance` | Cave entrance |
| `building_shop` | Shop building |
| `building_house` | House building |
| `building_tavern` | Tavern building |
| `building_mine` | Mine building |
| `building_chapel` | Chapel building |
| `building_azurine` | Azurine City building |
| `building_hideseek` | Hide & Seek building |
| `building_skeld` | The Skeld building |
| `building_gunsmith` | Gunsmith building (dark with red neon) |
| `building_vortalis` | Vortalis dungeon building |
| `building_earth205` | Earth-205 dungeon building |
| `building_wagashi` | Wagashi dungeon building |
| `building_earth216` | Earth-216 dungeon building |

#### Entrances/Exits (24 types)
| Type | Description |
|------|-------------|
| `mine_entrance` | Mine entrance |
| `mine_exit` | Mine exit |
| `mine_door` | Mine door |
| `azurine_entrance` | Azurine City entrance |
| `azurine_exit` | Azurine City exit |
| `cave_exit` | Cave exit |
| `dungeon_door` | Dungeon door |
| `house_entrance` | House entrance |
| `house_exit` | House exit |
| `deli_entrance` | Deli entrance |
| `deli_exit` | Deli exit |
| `diner_entrance` | Diner entrance |
| `diner_exit` | Diner exit |
| `diner_customer_exit` | Diner customer exit |
| `skeld_entrance` | Skeld entrance |
| `gunsmith_entrance` | Gunsmith entrance (red neon glow) |
| `vortalis_entrance` | Vortalis entrance |
| `vortalis_exit` | Vortalis exit |
| `earth205_entrance` | Earth-205 entrance |
| `earth205_exit` | Earth-205 exit |
| `wagashi_entrance` | Wagashi entrance |
| `wagashi_exit` | Wagashi exit |
| `earth216_entrance` | Earth-216 entrance |
| `earth216_exit` | Earth-216 exit |

#### Interior Props (12 types)
| Type | Description |
|------|-------------|
| `torch` | Torch |
| `neon_light` | Neon light |
| `rock` | Rock |
| `queue_zone` | Queue zone |
| `workbench` | Gunsmith workbench (tools on bench) |
| `weapon_rack` | Weapon rack (gun silhouettes) |
| `anvil` | Anvil |
| `crate` | Wooden crate |
| `barrel` | Barrel |
| `ocean_lantern` | Ocean lantern (Vortalis) |
| `paper_lantern` | Paper lantern (Wagashi) |
| `gas_lamp` | Gas lamp (flickering orange) |

#### NPC Entities (6 types)
| Type | Description |
|------|-------------|
| `gunsmith_npc` | Gunsmith NPC (blacksmith apron, hammer) |
| `mining_npc` | Mining Shop NPC (helmet, pickaxe) |
| `forge_npc` | Forge NPC (stocky blacksmith) |
| `farm_vendor` | Farm vendor |
| `fish_vendor` | Fish vendor (barrel + NPC) |
| `version_sign` | Update version sign (shows GAME_UPDATE) |

#### Forge Room (2 types)
| Type | Description |
|------|-------------|
| `forge_anvil` | Forge anvil (hot metal glow on top) |
| `forge_furnace` | Forge furnace (fire glow, chimney, smoke particles) |

#### Farm/House (4 types)
| Type | Description |
|------|-------------|
| `farm_well` | Farm well |
| `farm_table` | Farm table |
| `farm_bed` | Farm bed |
| `farm_chest` | Farm chest |

#### Deli Interior (14 types)
| Type | Description |
|------|-------------|
| `bread_station` | Bread prep station |
| `meat_station` | Meat prep station |
| `veggie_station` | Veggie prep station |
| `sauce_station` | Sauce prep station |
| `deli_counter` | Deli counter |
| `pickup_counter` | Pickup counter |
| `deli_queue_area` | Deli queue area |
| `deli_table` | Deli table |
| `deli_chair` | Deli chair |
| `deli_divider` | Deli divider |
| `deli_service_counter` | Deli service counter |
| `kitchen_door` | Kitchen door |
| `deli_vending` | Deli vending machine |
| `deli_condiment_table` | Deli condiment table |

#### Deli Floor/Kitchen (2 types)
| Type | Description |
|------|-------------|
| `deli_kitchen_floor` | Deli kitchen floor |
| `building_deli` | Deli building exterior |

#### Diner Interior (14 types)
| Type | Description |
|------|-------------|
| `building_diner` | Diner building exterior |
| `diner_booth` | Diner booth |
| `diner_booth_table` | Diner booth table |
| `diner_booth_seat` | Diner booth seat |
| `arcade_cabinet` | Arcade cabinet |
| `diner_jukebox` | Diner jukebox |
| `diner_floor` | Diner floor |
| `diner_counter` | Diner counter |
| `diner_tv` | Diner TV |
| `diner_pickup_counter` | Diner pickup counter |
| `diner_service_counter` | Diner service counter |
| `diner_kitchen_floor` | Diner kitchen floor |
| `kitchen_door_diner` | Diner kitchen door |
| `neon_sign_e216` | Earth-216 neon sign |

#### Fine Dining (15 types)
| Type | Description |
|------|-------------|
| `building_fine_dining` | Fine dining building exterior |
| `fine_dining_entrance` | Fine dining entrance |
| `fine_dining_exit` | Fine dining exit |
| `fd_floor_kitchen` | Fine dining kitchen floor |
| `fd_floor_dining` | Fine dining dining floor |
| `fd_service_wall` | Fine dining service wall |
| `fd_counter` | Fine dining counter |
| `fd_pickup_counter` | Fine dining pickup counter |
| `fd_serve_counter` | Fine dining serve counter |
| `fd_teppanyaki_table` | Teppanyaki table |
| `fd_teppanyaki_grill_0` | Teppanyaki grill slot 0 |
| `fd_teppanyaki_grill_1` | Teppanyaki grill slot 1 |
| `fd_teppanyaki_grill_2` | Teppanyaki grill slot 2 |
| `fd_teppanyaki_grill_3` | Teppanyaki grill slot 3 |
| `fd_host_stand` | Host stand |

#### Fine Dining NPCs/Doors (4 types)
| Type | Description |
|------|-------------|
| `fd_host_npc` | Host NPC |
| `fd_enter_door` | Fine dining enter door |
| `fd_exit_door` | Fine dining exit door |
| `fd_waiter_spot` | Waiter spot (no visual) |

#### Fishing (1 type)
| Type | Description |
|------|-------------|
| `fishing_spot` | Dock with water, planks, rope railing |

#### Skeld/Mafia (13 types)
| Type | Description |
|------|-------------|
| `skeld_task` | Skeld task terminal |
| `skeld_vent` | Skeld vent |
| `skeld_emergency_table` | Skeld emergency meeting table |
| `skeld_sabotage` | Skeld sabotage panel |
| `skeld_camera_mount` | Skeld wall-mounted camera |
| `skeld_cameras` | Skeld security camera console |
| `skeld_electrical_box` | Skeld electrical box |
| `mafia_lobby_laptop` | Mafia lobby laptop desk |
| `mafia_lobby_customize` | Mafia lobby customize station |
| `mafia_lobby_start` | Mafia lobby start button |
| `mafia_lobby_crate` | Mafia lobby large crate |
| `mafia_lobby_crate_sm` | Mafia lobby small crate |
| `mafia_lobby_exit` | Mafia lobby exit |

#### Grocery Shelf Types (16 types, all share `_shelfRenderer`)
| Type | Label | Item Shape |
|------|-------|------------|
| `deli_shelf_canned` | Canned Goods | can |
| `deli_shelf_snacks` | Snacks | bag |
| `deli_shelf_drinks` | Beverages | bottle |
| `deli_shelf_cereal` | Cereal | box |
| `deli_shelf_bread` | Bakery | loaf |
| `deli_shelf_pasta` | Pasta & Rice | box |
| `deli_shelf_sauces` | Sauces | bottle |
| `deli_shelf_dairy` | Dairy | carton |
| `deli_shelf_frozen` | Frozen | box |
| `deli_shelf_produce` | Produce | round |
| `deli_shelf_candy` | Candy | bag |
| `deli_shelf_baking` | Baking | box |
| `deli_shelf_spices` | Spices | jar |
| `deli_shelf_cleaning` | Cleaning | bottle |
| `deli_shelf_cookies` | Cookies & Treats | round |
| `deli_shelf_soups` | Soups | can |

All shelves use shelf color `#6a5a48` (except dairy `#5a6a78`, frozen `#4a5a6a`, produce `#4a5a38`, candy `#6a4a58`, spices `#5a4a38`, cleaning `#4a5a68`, cookies `#5a4a30`). Inner back panel is `#e8e4dc`.

#### Dynamic Ingredient Renderers
Registered at runtime from data registries:
- **Deli ingredients** — from `DELI_INGREDIENTS`, uses `_ingredientRenderer` (brown counter surface `#6a5a48`)
- **Diner ingredients** — from `DINER_INGREDIENTS`, uses `_dinerIngredientRenderer` (chrome counter `#c0c0c8`)
- **Fine dining ingredients** — from `FINE_DINING_INGREDIENTS`, uses `_fdIngredientRenderer` (dark marble counter `#2a1a14`)

#### Casino (14 types)
| Type | Description |
|------|-------------|
| `building_casino` | Casino building exterior (purple/maroon, gold trim) |
| `casino_carpet` | Casino carpet floor |
| `casino_bar` | Casino bar |
| `casino_pillar` | Casino pillar |
| `casino_blackjack` | Blackjack table (green felt) |
| `casino_roulette` | Roulette wheel |
| `casino_coinflip` | Coinflip station |
| `casino_cases` | Cases game |
| `casino_mines` | Mines game |
| `casino_dice` | Dice game |
| `casino_rps` | Rock Paper Scissors station |
| `casino_baccarat` | Baccarat table |
| `casino_slots` | Slot machine |
| `casino_keno` | Keno terminal |

#### Spar (4 types)
| Type | Description |
|------|-------------|
| `building_spar` | Spar building exterior (steel blue, cyan accent) |
| `spar_hub_floor` | Spar hub floor |
| `spar_room_door` | Spar room door |
| `spar_arena_floor` | Spar arena floor |

### How to Add a New Entity Renderer

1. Add the renderer function to `ENTITY_RENDERERS`:
```javascript
ENTITY_RENDERERS.my_entity = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Draw your entity at (ex, ey) with pixel size (cw, ch)
};
```
2. Add the entity to the level data in `levelData.js`
3. If the entity needs collision, mark wall tiles in the collision grid
4. For dynamic entities (like ingredients), register via data registries

### Common Rendering Patterns

- **Pulsing/animated:** Use `Date.now() / 1000` for time, `Math.sin(t * speed)` for pulse
- **Shadow:** `ctx.fillStyle = 'rgba(0,0,0,0.15-0.25)'` + `ctx.ellipse()`
- **Neon glow:** Two-layer: dark base + translucent colored overlay
- **Name labels:** Black shadow text at `(x+1, y+1)`, colored text at `(x, y)`, monospace font
- **Time-based animations:** Store `Date.now() / 1000` in local `t`, derive all animations from it

---

## Hit Effects (hitEffects.js)

### Registry Structure

```javascript
const HIT_EFFECT_RENDERERS = {
  effectType: (h, ctx, alpha) => { ... },
};
```

**Parameters:**
| Parameter | Description |
|-----------|-------------|
| h | Hit effect object with `.x`, `.y`, `.life`, `.dmg`, `.gold`, `.tx`, `.ty`, `.angle`, `.px`, `.py` |
| ctx | Canvas 2D rendering context |
| alpha | Opacity (derived from `h.life / maxLife`, fades to 0) |

### Effect Lifecycle

1. **Creation:** Hit effect is added to the `hitEffects` array with initial `life` value
2. **Animation:** Each frame, `life` decrements. `alpha` is computed from `life / maxLife`
3. **Rendering:** The renderer function is called with current alpha
4. **Removal:** When `life` reaches 0, the effect is removed from the array

### Complete Hit Effect Type List (72 named types + _default = 73 entries)

#### Combat — Basic (5 types)
| Type | Visual | Max Life |
|------|--------|----------|
| `hit` | Red burst + floating red damage number | 19 |
| `crit` | Large purple damage number + star particles | 28 |
| `kill` | Gold burst + "+Xg" gold text | 25 |
| `heal` | Green "+X" floating text + green ring | 20 |
| `grab` | Orange "-X" floating text | 20 |

#### Elemental — Frost (2 types)
| Type | Visual |
|------|--------|
| `frost_hit` | Cyan ice burst + ice shards flying outward (6 shards) |
| `frost_nova` | Expanding cyan ring (radius 15->125) + 8 ice crystal particles |

#### Elemental — Fire (3 types)
| Type | Visual |
|------|--------|
| `burn_hit` | Orange fire burst + 8 fire sparks |
| `burn_tick` | Orange DOT number with fire emoji floating up |
| `inferno_explode` | Expanding orange/red ring (radius 10->105) + 10 flame particles |

#### Elemental — Poison (3 types)
| Type | Visual |
|------|--------|
| `poison_hit` | Green splash + 5 poison droplets + skull damage number |
| `poison_tick` | Green DOT number with skull emoji floating up |
| `poison_puddle` | Green pool on ground |

#### Lightning (4 types)
| Type | Visual |
|------|--------|
| `lightning` | Jagged bolt between two points (5 segments) — white/light blue |
| `ground_lightning` | Jagged bolt shooting UP from ground (Kashimo-style) |
| `godspeed_activate` | Massive white-blue lightning burst (16 branching bolts, radius 40->220) |
| `shockwave` | Expanding white-blue ring (radius 20->80) |

#### Blood/Melee (5 types)
| Type | Visual |
|------|--------|
| `cleave_hit` | Red slash burst (3 lines radiating) |
| `blood_slash_hit` | Big dramatic X-shaped blood slashes + blood mist |
| `blood_slash_arc` | Sweeping blade of blood radiating outward |
| `blood_slash` | Blood slash effect |
| `trident_slash` | Trident slash effect |

#### JJK/Domain (2 types)
| Type | Visual |
|------|--------|
| `shrine_activate` | Domain expansion burst — 16 slash marks radiating from center + blood drops |
| `shrine_slash` | JJK-style bloody slash with blood splatter (6 blood drops) + cross-cut |

#### Status/Buff (3 types)
| Type | Visual |
|------|--------|
| `stun` | 3 yellow stars circling above impact point |
| `buff` | 3 green upward arrows rising |
| `cast` | Blue-white expanding ring + inner glow |

#### Ninja (5 types)
| Type | Visual |
|------|--------|
| `ninja_dash` | Dash trail effect |
| `ninja_activate` | Ninja activation burst |
| `ninja_aoe` | Area of effect |
| `ninja_slash` | Ninja slash |
| `ninja_dash_end` | Dash endpoint effect |

#### Ocean/Pirate (Vortalis) (9 types)
| Type | Visual |
|------|--------|
| `water_geyser` | Water geyser eruption |
| `anchor_sweep` | Anchor sweep attack |
| `ink_splash` | Ink splash |
| `coral_spike` | Coral spike |
| `fear_swirl` | Fear swirl |
| `tether_chain` | Tether chain |
| `shield_block` | Shield block |
| `reflect_spark` | Reflect spark |
| `ghost_ship` | Ghost ship apparition |

#### Boss/Special (5 types)
| Type | Visual |
|------|--------|
| `kraken_tentacle` | Kraken tentacle |
| `whirlpool` | Whirlpool |
| `cannon_explosion` | Cannon explosion |
| `explosion` | Boulder SHATTERS — massive boss-level impact (14 jagged rock chunks with physics) |
| `mummy_explode` | Mummy explosion |

#### Mob/Summon (6 types)
| Type | Visual |
|------|--------|
| `thorns` | Orange-red sparks radiating (6 sparks) |
| `heal_zone` | Healing zone |
| `heal_beam` | Healing beam |
| `mob_heal` | Mob heal |
| `stomp` | Ground stomp |
| `summon` | Summon effect |

#### Arrow (2 types)
| Type | Visual |
|------|--------|
| `arrow_bounce` | Arrow bounce |
| `arrow_fade` | Arrow fade |

#### Text/UI (1 type)
| Type | Visual |
|------|--------|
| `text_popup` | Generic text popup |

#### Smoke/Generic (1 type)
| Type | Visual |
|------|--------|
| `smoke` | Gray expanding cloud puff (3 overlapping circles) |

#### Earth-205 Melee Weapons (8 types)
| Type | Visual |
|------|--------|
| `pipe_hit` | Pipe weapon impact |
| `slingshot_impact` | Slingshot projectile impact |
| `flamethrower_tick` | Flamethrower damage tick |
| `nail_pin` | Nail/pin impact |
| `glass_slash` | Glass slash |
| `sledgehammer_shockwave` | Sledgehammer ground shockwave |
| `cleaver_slash` | Cleaver slash |
| `chain_hit` | Chain weapon hit |

#### Earth-216 / Wagashi Weapons (5 types)
| Type | Visual |
|------|--------|
| `flare_burst` | Flare burst (orange rays) |
| `grenade_explosion` | Grenade explosion (gray smoke + orange flash) |
| `pin_pop` | Colorful pin scatter (6 carnival colors) |
| `sandbag_drop` | Dust cloud impact |
| `sonic_wave` | Purple/blue sound wave rings (3 concentric) |

#### Late-Game Weapons (3 types)
| Type | Visual |
|------|--------|
| `stiletto_stab` | Quick red flash + thin stab line |
| `chemical_beam` | Green toxic beam dissipation + rising particles |
| `meltdown_pulse` | Green toxic expanding ring |

#### Fallback (1 type)
| Type | Visual |
|------|--------|
| `_default` | Orange circle (fallback for unknown types) |

### Common Effect Patterns

**Damage numbers:**
```javascript
const floatY = h.y - 10 - (maxLife - h.life) * 1.6;  // floats upward
ctx.font = "bold 16px monospace";
ctx.strokeStyle = `rgba(0,0,0,${alpha})`;  // black outline
ctx.lineWidth = 3;
ctx.strokeText("-" + h.dmg, h.x, floatY);
ctx.fillStyle = `rgba(255,80,60,${alpha})`;  // colored fill
ctx.fillText("-" + h.dmg, h.x, floatY);
```

**Expanding ring:**
```javascript
const prog = 1 - alpha;
const radius = startR + prog * expandR;
ctx.strokeStyle = `rgba(r,g,b,${alpha * 0.75})`;
ctx.lineWidth = 3;
ctx.beginPath(); ctx.arc(h.x, h.y, radius, 0, Math.PI * 2); ctx.stroke();
```

**Particles radiating outward:**
```javascript
for (let i = 0; i < count; i++) {
  const a = i * Math.PI * 2 / count + prog * rotSpeed;
  const d = prog * maxDist + baseOffset;
  ctx.fillStyle = `rgba(r,g,b,${alpha * 0.8})`;
  ctx.beginPath();
  ctx.arc(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, size, 0, Math.PI * 2);
  ctx.fill();
}
```

---

## Tile Renderer (tileRenderer.js)

### drawLevelBackground(camX, camY)

Renders the background tile grid for every scene. Uses viewport culling:

```javascript
startTX = max(0, floor(camX / TILE))
startTY = max(0, floor(camY / TILE))
endTX = min(level.widthTiles - 1, startTX + ceil(VIEW_W / TILE) + 1)
endTY = min(level.heightTiles - 1, startTY + ceil(VIEW_H / TILE) + 1)
```

### Scene Background Colors

These are the full-screen fill colors applied before tile rendering:

| Scene | Background Color |
|-------|-----------------|
| Test Arena | `#181820` |
| Farm | `#5a4830` |
| Cooking | `#c0b898` |
| Gunsmith | `#1a1518` |
| Mine | `#1a1510` |
| Cave | `#1a1818` |
| Azurine | `#0e0e1a` |
| Vortalis | `#0a1828` |
| Earth-205 | `#0e0c08` |
| Hide & Seek | `#0a0a10` |
| Mafia Lobby | `#0a0a14` |
| The Skeld | `#050508` |
| Lobby | `#080810` |
| Default (dungeon) | `#1e1e26` |

### Per-Scene Tile Styles

#### Lobby (Cyberpunk)
- **Wall** (`@` in collision ASCII): Dark steel `#0a0a14`, inner `#141420`, cyan neon edge `rgba(0,204,255,0.12)`, occasional panel rivet
- **Floor**: Dark metallic grid `rgb(16+sv, 16+sv, 22+sv*2)`, cyan grid lines `rgba(0,204,255,0.04)`, circuit trace accents, circuit nodes at every 8th intersection

#### Farm
- **Wall** (`@`): Stone `#4a4038`, inner `#5a5048`, brick pattern
- **Indoor** (ty >= 20): Wooden planks `rgb(130+sv*8, 100+sv*6, 60+sv*4)`, plank lines, vertical joints
- **Outdoor**: Brown dirt `rgb(90+sv*3, 70+sv*2, 45+sv)`, speckles

#### Cave
- **Outer edge wall**: Dark stone `#1a1818`, inner `#242220`, crack lines
- **Floor**: Gray stone `rgb(48+sv*2, 46+sv*2, 52+sv)`, pebble dots

#### Azurine City
- **Outer edge wall**: Dark steel `#0e0e1a`, inner `#181828`, cyan accent line `rgba(0,204,255,0.12)`
- **Floor**: Dark blue-gray `rgb(32+sv, 32+sv, 42+sv*2)`, cyan grid `rgba(0,204,255,0.03)`, neon floor cracks (cyan + magenta)

#### Vortalis (Ocean/Pirate)
- **Outer edge wall**: Dark barnacle stone `#0a1820`, inner `#122028`, barnacle accents `rgba(34,170,204,0.08)`
- **Floor**: Dark teal stone `rgb(16+sv, 28+sv, 36+sv*2)`, water stain ellipses

#### Earth-205 (Gothic Noir)
- **Outer edge wall**: Dark stone `#0a0806`, inner `#121010`, moss accents `rgba(136,204,68,0.06)`
- **Floor**: Dark cobblestone `rgb(14+sv, 12+sv, 10+sv)`, cobblestone crack lines

#### Mine
- **Wall**: Rocky cave `#2a2010`, inner `#342818`, rock texture circles, cracks
- **Floor**: Earthy brown `rgb(52+sv*2, 44+sv*2, 32+sv)`, pebbles

#### Gunsmith
- **Wall**: Stone workshop `#3a3238`, inner `#443840`, brick pattern
- **Floor**: Dark wood planks `rgb(58+sv*3, 42+sv*2, 28+sv)`, plank lines, nails

#### Cooking (Deli)
- **Wall**: Warm cream `#c8b898`, brick accents
- **Floor**: Checkered tiles `#e0d8c8` / `#d0c8b0`

#### Hide & Seek
- **Outer wall**: Heavy dark charcoal `#0e0e14`, inner `#141420`, rust streaks
- **Interior wall**: Dark slate `#1a1a22`, inner `#202030`, vent grate slats, bolt rivets
- **Floor**: Dusty concrete `rgb(30+sv, 30+sv, 38+sv)`, scuff marks, dust speckles, amber light pools every 6 tiles

#### Mafia Lobby
- **Wall**: Dark steel panels `rgb(24+sv, 24+sv, 32+sv)`, bolt rivets
- **Floor**: Brownish metal grating `rgb(62+sv, 56+sv, 46+sv)`, cross pattern on every 4th tile

#### The Skeld
- **Wall**: Dark metal hull `rgb(28+sv, 28+sv, 36+sv)`, panel seams, bolt rivets, colored accent stripe `rgba(60,90,140,0.12)`
- **Floor**: Lighter gray metal `rgb(48+sv*2, 48+sv*2, 56+sv*2)`, grate lines, blue light pools every 8 tiles, hazard stripes every 12 tiles

### Dungeon Palette System (FLOOR_CONFIG integration)

For dungeon scenes, tiles use the `FLOOR_CONFIG[currentDungeon][dungeonFloor].palette` colors:

| Palette Key | Default Value | Usage |
|-------------|---------------|-------|
| `floor1` | `#3a3840` | Primary floor tile |
| `floor2` | `#383638` | Secondary floor tile (alternating) |
| `wall` | `#2a2a32` | Wall base color |
| `wallAccent` | `#454552` | Wall accent/highlight |
| `accent2` | `#8a2020` | Floor blood splatters near center |
| `gridLine` | `#32303a` | Floor grid line color |

**Floor tiles:** Two-tone alternating `(tx + ty) % 2 === 0 ? floor1 : floor2`, with grid lines at `alpha 0.15`.

**Interior cover blocks:** Brick pattern using floor/wall palette colors with top highlight and bottom shadow.

**Accent splatters:** Within distance 12 of center, sparse circles using `accent2` at `alpha 0.2`.

### Grid Line Rendering

Grid lines are rendered differently per scene:
- **Dungeon:** `strokeRect` with `gridLine` color at `alpha 0.15`
- **Lobby/Azurine:** Cyan `rgba(0,204,255,0.03-0.04)` strokeRect
- **Most scenes:** `rgba(0,0,0,0.04-0.06)` strokeRect

---

## Asset Loader (assetLoader.js)

### Manifest Format

`assets/manifest.json`:
```json
{
  "sprites": {
    "key": "path/to/sprite.png"
  },
  "tiles": {
    "sceneName": "path/to/tileset.png"
  },
  "entities": {
    "key": "path/to/entity.png"
  },
  "frameSize": {
    "default": [48, 48],
    "customType": [w, h]
  }
}
```

### AssetLoader API

| Method | Signature | Description |
|--------|-----------|-------------|
| `init()` | `async init()` | Fetch manifest, preload all sprites + entities. Called once at startup. |
| `get(key)` | `get(key) -> Image\|null` | Get loaded Image by key. Returns null if not loaded (use procedural fallback). |
| `getTileset(sceneName)` | `getTileset(name) -> Image\|null` | Shorthand for `get('tile_' + sceneName)`. |
| `getFrame(key, col, row, sizeType)` | `getFrame(...) -> {img, sx, sy, sw, sh}\|null` | Get source rect for a spritesheet frame. col=frame column (0-3), row=direction row (0=down, 1=up, 2=left, 3=right). |
| `preloadScene(sceneName)` | `async preloadScene(name)` | Preload tileset assets for a specific scene. Call on scene transition. |
| `ready()` | `ready() -> boolean` | Check if all preloaded assets are ready. |
| `progress()` | `progress() -> number` | Loading progress 0 to 1. |

### Internal State

```javascript
_cache: {}       // key -> Image
_ready: {}       // key -> boolean
_manifest: null  // parsed manifest.json
_totalLoaded: 0
_totalAssets: 0
_basePath: 'assets/'
_sceneAssets: {} // sceneName -> [{key, path}]
_initialized: false
```

### How to Add New Assets

1. Place the image file in `assets/` subdirectory
2. Add entry to `assets/manifest.json` under `sprites`, `tiles`, or `entities`
3. For tiles, use scene name as the key (auto-prefixed with `tile_`)
4. For custom frame sizes, add entry to `frameSize`
5. Assets auto-load on `init()` (sprites/entities) or `preloadScene()` (tiles)

### Fallback-to-Procedural Pattern

All renderers follow this pattern:
```javascript
const sprite = AssetLoader.get('entity_key');
if (sprite) {
  ctx.drawImage(sprite, ...);
} else {
  // Procedural canvas drawing (the current codebase)
}
```

Currently the entire codebase runs fully procedural (no sprite assets loaded yet). The AssetLoader infrastructure exists for future sprite integration.

---

## Camera System (cameraSystem.js)

### Overview

Among Us-style security cameras for The Skeld. Player interacts with the camera console to see 4 live feeds in a 2x2 grid. Locked in place while viewing. X / Escape to exit. Wall-mounted cameras blink red when someone is watching.

### SKELD_CAMERAS Data

Coordinates are **actual grid coords** (not virtual):

| Index | ID | Name | Center X | Center Y |
|-------|----|------|----------|----------|
| 0 | `hallway` | Medbay Hallway | 40 | 10 |
| 1 | `xroads` | Security Hallway | 20 | 34 |
| 2 | `admin` | Admin Hallway | 76 | 44 |
| 3 | `lower` | Comms Hallway | 87 | 62 |

### CameraState

```javascript
const CameraState = {
  active: false,    // player is viewing cameras
  blinking: false,  // cameras should blink (someone is watching)
};
```

### CameraSystem API

| Method | Description |
|--------|-------------|
| `enter()` | Activate camera view (`active = true`, `blinking = true`) |
| `exit()` | Deactivate camera view (`active = false`, `blinking = false`) |
| `isActive()` | Returns `CameraState.active` |
| `drawOverlay()` | Called every frame from `draw()` when active. Renders 2x2 camera grid. |
| `handleClick(mx, my)` | Handle click on close button. Returns true if handled. |
| `handleKey(key)` | Handle Escape/X key to close. Returns true if handled. |

### 2x2 Grid Rendering

**Layout:**
```javascript
fullW = BASE_W * 0.6
fullH = BASE_H * 0.6
panelW = (fullW - 12) / 2     // gap = 12
panelH = (fullH - 12) / 2
marginX = (BASE_W - fullW) / 2
topY = (BASE_H - fullH) / 2 + 32
```

**Per-camera feed rendering:**
1. Panel border: dark background `#0a0e12`, border `#1a2a35`
2. Viewport: original 75% coverage scaled to fit panel
3. Tile rendering (Skeld tile style)
4. Entity rendering (calls `ENTITY_RENDERERS`)
5. Character rendering (calls `drawChar` for bots + player)
6. Dead body rendering
7. **Post-processing overlays:**
   - Green tint: `rgba(0,40,20,0.12)`
   - Scan lines: every 3px, `rgba(0,0,0,0.06)`
   - Static noise: 8 sparse dots per frame
   - REC indicator: pulsing red dot + "REC" text
   - Camera name: bottom-left in green monospace
   - Timestamp: bottom-right HH:MM:SS

**Close button:** Circle at `(marginX - 36, topY - 38)`, radius ~16px

---

## Armor Visuals (armorVisuals.js)

### Tier Structure

4 tiers defined (Tier 0 = no armor, uses player color defaults):

| Tier | Name | Has Glow | Has Shimmer |
|------|------|----------|-------------|
| 1 | Leather | No | No |
| 2 | Iron | No | No |
| 3 | Warden | Yes (ember) | No |
| 4 | Void | Yes (purple) | Yes |

### Color Palettes Per Tier

#### Tier 1 — Leather
| Key | Value | Usage |
|-----|-------|-------|
| `primary` | `#6a5030` | Main leather color |
| `secondary` | `#7a6040` | Stitch lines, collar |
| `dark` | `#5a4028` | Boot base |
| `darker` | `#3a2a18` | Boot sole |
| `highlight` | `#7a6040` | Same as secondary |
| `belt` | `#5a4020` | Chest bottom trim |
| `accent` | `null` | Not used |
| `glow` | `null` | No glow effect |
| `animSpeed` | `0` | No animation |

#### Tier 2 — Iron
| Key | Value | Usage |
|-----|-------|-------|
| `primary` | `#4a5a64` | Main iron color |
| `secondary` | `#6a7a84` | Chainmail links |
| `dark` | `#3a4a54` | Dark iron |
| `highlight` | `#5a6a74` | Plate highlight |
| `accent` | `#8a9aa4` | Rivets, helmet bolts |
| `bootStripe` | `#7a8a94` | Boot silver accent stripe |
| `glow` | `null` | No glow effect |
| `animSpeed` | `0` | No animation |

#### Tier 3 — Warden
| Key | Value | Usage |
|-----|-------|-------|
| `primary` | `#3a4a3a` | Main plate color (dark green-grey) |
| `secondary` | `#4a5a4a` | Scale pattern |
| `dark` | `#2a3a2a` | Dark plate |
| `highlight` | `#5a6a5a` | Knee guards, trim |
| `emberEmblem` | `#8a6030` | Chest center emblem base |
| `glow.color` | `[220, 140, 50]` | Ember glow RGB |
| `glow.baseAlpha` | `0.3` | Base glow opacity |
| `glow.amplitude` | `0.15` | Glow pulse range |
| `animSpeed` | `0.005` | Glow animation speed |

#### Tier 4 — Void
| Key | Value | Usage |
|-----|-------|-------|
| `primary` | `#1a1020` | Main void color (near-black purple) |
| `secondary` | `#2a1a30` | Plate panels |
| `dark` | `#1a1020` | Same as primary |
| `highlight` | `#2a1a30` | Same as secondary |
| `voidCore` | `#3a1a4a` | Chest cross emblem |
| `bootSole` | `#0a0810` | Boot dark sole |
| `glow.color` | `[140, 50, 220]` | Purple glow RGB |
| `glow.baseAlpha` | `0.4` | Base glow opacity |
| `glow.amplitude` | `0.2` | Glow pulse range |
| `animSpeed` | `0.006` | Glow animation speed |
| `shimmer` | `[180, 100, 255]` | Boot shimmer RGB |
| `coreGlow` | `[180, 80, 255]` | Chest core orb RGB |
| `eyeGlow` | `[160, 60, 255]` | Helmet visor eyes RGB |

### tierGlow() Function

```javascript
function tierGlow(tier, time, speedOverride)
```

Computes animated glow alpha for a given tier and time:
```
alpha = glow.baseAlpha + sin(time * speed) * glow.amplitude
```

Returns `0` for tiers without glow (T1, T2).

**Usage in drawChoso():**
```javascript
const tPulse = tierGlow(3, renderTime);         // default speed
const ePulse = tierGlow(3, renderTime, 0.006);  // custom speed
const vGlow = tierGlow(4, renderTime, 0.008);   // void boots
```

The `speedOverride` parameter allows different armor pieces on the same tier to pulse at different rates, creating visual variety.

### Glow Effects Summary

| Tier | Glow Color | Base Alpha | Amplitude | Speed |
|------|-----------|------------|-----------|-------|
| 3 (Warden) | `rgb(220, 140, 50)` ember | 0.3 | 0.15 | 0.005 |
| 4 (Void) | `rgb(140, 50, 220)` purple | 0.4 | 0.2 | 0.006 |

### Shimmer (Tier 4 only)

The Void tier boots have a traveling shimmer pixel:
```javascript
const shimX = Math.floor(renderTime / 120) % (bootWidth - 4);
ctx.fillStyle = `rgba(180, 100, 255, ${vGlow})`;
ctx.fillRect(bootX + 2 + shimX, bootY - 3, 2, 1);
```

This creates a single bright pixel that scans left-to-right across the boot cuff, restarting every `(bootWidth - 4) * 120ms`.

### Void Core Effect (Tier 4 Chest)

The chest piece has a pulsing cross emblem with a glowing orb:
```javascript
// Cross emblem
ctx.fillStyle = '#3a1a4a';  // voidCore color
ctx.fillRect(centerX - 1, bodyY + 5, 2, 10);  // vertical
ctx.fillRect(centerX - 4, bodyY + 9, 8, 2);   // horizontal

// Glowing orb at center
ctx.fillStyle = `rgba(180, 80, 255, ${vGlow * 0.6})`;  // coreGlow
ctx.beginPath(); ctx.arc(centerX, bodyY + 10, 5, 0, Math.PI * 2); ctx.fill();
```
