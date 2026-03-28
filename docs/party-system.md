# Party System & Bot AI

## Overview
The Party System manages multi-member dungeon runs where the player fights alongside 1-3 AI-controlled bots. Every participant — player or bot — is represented as a uniform "party member" with independent HP, gold, guns, melee weapons, equipment, potions, and lives. The system is designed with future multiplayer in mind: bots are treated as future networked users, not special-cased NPCs. Even solo runs activate the party (party of 1), so the code path is always entity-agnostic and networking is trivial to add later.

## Files
- `js/shared/partyData.js` — Config constants (`PARTY_CONFIG`), bot cosmetic presets (`BOT_PRESETS`)
- `js/authority/partySystem.js` — Party state, member factory, lifecycle, targeting, gold, death/revive, wave scaling
- `js/authority/botAI.js` — Bot FSM, movement, combat (shooting + melee), equipment/buff purchasing, telegraph dodging, potion usage, death/respawn timers

## Key Functions & Globals

### State
- `PartyState` — Global state object: `active` (bool), `members` (PartyMember[]), `localPlayerId`, `shopOpen`, `spectateTarget`, `queueSlots` (lobby toggle UI).
- `_currentDamageTarget` — Per-tick damage routing target, set by mob AI so `dealDamageToPlayer()` hits the correct entity.

### Party Member Structure
Each member returned by `createPartyMember(slotIndex, controlType)` has:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | `'player'` or `'bot_1'`, `'bot_2'`, `'bot_3'` |
| `slotIndex` | number | 0 = player, 1-3 = bots |
| `name` | string | Display name (from `BOT_PRESETS` or player name) |
| `controlType` | string | `'local'` (player), `'bot'`, or `'remote'` (future) |
| `entity` | object | Position, HP, cosmetics, physics. Player reuses global `player`; bots get a new object |
| `gun` | object | Independent gun state: id, damage, fireRate, magSize, ammo, reloading, special, bulletColor |
| `melee` | object | Independent melee state: damage, range, cooldown, critChance, special |
| `equip` | object | Equipment slots: armor, boots, pants, chest, helmet, gun, melee |
| `gold` | number | Player uses global `gold`; bots have their own wallet (starts at 0) |
| `potion` | object | `{ count, cooldown, cooldownMax, healAmount }` — bots start with 3 potions |
| `lives` | number | Copied from global `lives` at init |
| `dead` | bool | Death state flag |
| `deathTimer` | number | Frames remaining in death animation |
| `respawnTimer` | number | Frames until auto-respawn |
| `active` | bool | Whether the member is participating |
| `ai` | object/null | Bot AI state (null for player). Contains `state`, `target`, `targetAge`, `shootCD`, `meleeCD` |

### Core Functions

#### PartySystem
- `init(slotCount)` — Creates the party. Slot 0 is always the local player. Slots 1+ are bots. Resets all state.
- `reset()` — Clears party on dungeon exit. Resets `PartyState.active`, members array, shop, spectate, and `_currentDamageTarget`.
- `getAliveEntities()` — Returns entity objects for all alive members. Falls back to `[player]` if party is empty (lobby safety).
- `getAliveCount()` — Count of alive, active members.
- `getAlive()` — Returns full member objects (not just entities) for alive members.
- `allDead()` — True when every member is dead or inactive.
- `getNearestTarget(x, y)` — Returns the closest alive entity to a world position. Used for mob targeting.
- `getMobTarget(mob)` — Sticky targeting with periodic retarget (every `MOB_RETARGET_INTERVAL` frames, or immediately if current target is dead).
- `getLocalMember()` — Returns the player's member object.
- `getMemberById(id)` / `getMemberByEntity(entity)` — Lookup helpers.
- `resolveKiller(killerId)` — Returns `{ member, entity, gun, melee, equip, id }` for any participant. Works uniformly for player, bot, or future remote user.
- `addGold(memberId, amount)` / `getGold(memberId)` / `spendGold(memberId, amount)` — Gold routing. Player gold uses the global; bot gold uses the member field.
- `handleMemberDeath(member)` — Handles lethal damage. Checks for auto-revive (chest armor, once per run), then marks dead, decrements lives, starts death animation, clears status effects, triggers game-over if all dead.
- `reviveMember(member)` — Between-waves shop revive. Costs `REVIVE_BASE_COST * dungeonFloor` from the dead member's own gold.
- `hasRevivable()` — True if any dead member still has lives remaining.
- `onFloorAdvance()` — Auto-respawns dead members with lives > 0 and repositions bots near the player.
- `healAll()` — Full heals all alive members (called on wave clear).
- `getSpectateTarget()` — When player is dead, returns the nearest alive bot entity for camera follow.
- `getMobCountScale()` / `getMobHPScale()` — Wave scaling multipliers (see section below).

#### BotAI
- `tick()` — Main entry point, called once per frame from `authorityTick`. Iterates all bot members.
- `tickBot(member)` — Per-bot frame update: cooldowns, knockback, reload, potions, status effects, telegraph dodge, FSM.
- `tickDeadBot(member)` — Ticks death animation and respawn countdown for dead bots.
- `botShoot(member, mob)` — Creates a bullet aimed at the target mob. Sets `ownerId` on the bullet for kill attribution.
- `botMelee(member, mob)` — Deals melee damage if within range, applies cooldown.
- `botUsePotion(member)` — Heals the bot, respects chest heal boost, decrements potion count.
- `_findTarget(member)` — Smart target selection: prefers low-HP mobs (< 25% HP) within 1.5x distance of the nearest mob.
- `checkTelegraphDanger(member)` — Checks all active telegraphs (circle, line, cone, ring, tiles) and dodges away from danger zones.
- `applySeparation(member)` — Pushes bots apart when closer than `BOT_SEPARATION_DIST` to prevent stacking.

## How It Works

### Party Lifecycle
1. **Lobby** — Player toggles `PartyState.queueSlots[1-3]` to enable bot slots (up to 3 bots, max party size 4).
2. **Dungeon Entry** — `PartySystem.init(slotCount)` creates members. PartyState.active = true. Even solo activates the party.
3. **Combat** — `BotAI.tick()` runs every frame. Mobs target any alive member via `PartySystem.getMobTarget(mob)`.
4. **Wave Clear** — `PartySystem.healAll()` restores everyone. Between-waves shop opens.
5. **Floor Advance** — `PartySystem.onFloorAdvance()` respawns dead members with remaining lives.
6. **Dungeon Exit** — `PartySystem.reset()` clears everything.

### Bot AI FSM

Bots are fully autonomous — they never follow the player. The FSM evaluates every frame based on HP, mob proximity, and wave state.

#### States

| State | Condition | Behavior |
|-------|-----------|----------|
| **hunt** | Mob exists but beyond `BOT_ENGAGE_RANGE` (250px) | Run toward the mob. Each bot offsets its approach angle by `slotIndex` to avoid stacking. |
| **engage** | Mob within `BOT_ENGAGE_RANGE` | Active combat: shoot + melee + strafe. Weapon choice based on DPS comparison. |
| **flee** | HP < `BOT_FLEE_THRESHOLD` (15%) and mob within 150px | Run toward the shop station (safety zone). Still shoots while fleeing. |
| **shop** | Wave cleared/waiting/revive_shop | Walk to shop station, buy equipment and buffs with own gold. |
| **roam** | No mobs, wave active but nothing to fight | Wander randomly within ~200px, pick new point every ~120 frames. |

#### Transitions (evaluated every frame, top to bottom)
1. HP < 15% and mob nearby -> `flee`
2. Mob within engage range -> `engage`
3. Mob exists but far -> `hunt`
4. Wave cleared/waiting -> `shop`
5. No mobs -> `roam`

#### Telegraph Dodge (highest priority override)
Before the FSM runs, `checkTelegraphDanger()` checks if the bot is inside any active telegraph zone (circle, line, cone, ring, or tiles) with a 20px safety margin. If so, the bot dodges at 1.2x speed away from the danger center, skipping normal FSM logic. Bots still shoot while dodging if a target is available.

### Bot Combat

#### Weapon Switching Logic
Bots compare melee DPS vs gun DPS each frame:
- `meleeDPS = melee.damage / melee.cooldown`
- `gunDPS = gun.damage / (gun.fireRate * 4)`
- If `meleeDPS >= gunDPS * 0.8` or gun is empty/reloading, prefer melee (rush toward mob).
- Otherwise, prefer gun (maintain effective range, strafe at distance).

Even melee-focused bots still shoot while closing distance.

#### Shooting
- Bullets are created with `fromPlayer: true` and `ownerId: member.id` for kill attribution.
- Shoot cooldown uses the gun's actual `fireRate * 4` frames (same formula as player).
- Auto-reload when magazine is empty (90-frame hardcoded reload, not from gun data).

#### Melee
- Deals damage via `dealDamageToMob()` when within `melee.range`.
- Cooldown uses the melee weapon's actual `cooldown` value.

#### Strafing
During engage state at effective range, bots strafe perpendicular to the mob. Strafe direction flips every 60-120 frames (randomized). Strafe speed = `speed * 0.5`.

#### Movement Speeds
- **Dodge** (telegraph): `speed * 1.2`
- **Strafe** (engage): `speed * 0.5`
- **Flee**: `speed * 0.8`
- **MoveAway** (too close to mob): `speed * 0.7`

#### Ninja Dash
Bots can chain up to 3 dashes: `chainWindow = 180` frames, `dashDuration = 14` frames, `dashSpeed = 21.85`, `dashCooldownMax = 240` frames.

#### Ultimate Activation
- **Shrine** (cleave): `dmg = round(melee.damage * 0.6)`
- **Godspeed** (storm): `dmg = round(melee.damage * 0.5)`

### Bot Equipment Purchasing

Between waves, bots walk to the shop station at `(984, 792)` = tile `(20, 16)` and spend their own gold.

#### `_tryBuyEquipment(member)`
Checks equipment categories in priority order: Guns, Melees, Chest, Pants, Boots, Helmets. For each category, finds the next tier above the bot's current tier, checks wave requirements and cost, then purchases. Equipment purchases preserve existing damage buffs from buff purchases (tracked via `_baseDamage`).

#### `_tryBuyBuff(member)`
Buys consumable buffs with situational priority:
1. Health Potion is top priority if HP < 70%.
2. Gun Damage, Melee Damage, Lifesteal, Party Lifesteal (buff priority indices `[0,1,4,5,3]`).
3. Health Potion as low priority if HP >= 70% (stockpiling).

Party Lifesteal is a special shared-cost purchase — the shop item's `action()` deducts split shares from all members' gold.

Each bot tracks its own purchase counts (`member._shopBought[]`) independently, with a 45-frame cooldown between purchases. If the bot can't afford anything, it waits 60 frames then transitions to roam.

### Bot Potion Usage
- Bots start with 3 potions and buy more from the shop.
- Auto-use triggers when HP < 40% and potion is off cooldown.
- Heal amount respects chest armor's `healBoost` multiplier.
- Cooldown: 120 frames (2 seconds).

### Death, Respawn, and Revive

#### Death
`PartySystem.handleMemberDeath(member)`:
1. Checks for auto-revive from chest armor (`hasRevive(equip)`, once per run via `_reviveUsed` flag). Restores 30% HP.
2. If no auto-revive: marks `dead = true`, decrements `lives`, starts death animation (`DEATH_ANIM_FRAMES`), then respawn countdown (`RESPAWN_COUNTDOWN`).
3. Clears all status effects via `StatusFX.clearEntity(entity)`.
4. If all members are dead, triggers game over.

#### Bot Auto-Respawn
`BotAI.tickDeadBot(member)`:
1. Death animation phase: 40 frames. Rotation = `(1 - timer/40) * PI/2`.
2. When animation ends and lives > 0, starts respawn countdown: 180 frames (3 seconds).
3. When respawn timer hits 0: resets `dead`, restores full HP, clears `_isDead`, spawns near a random alive member (`x + random(-40,40)`, `y + random(-40,40)`), clears status effects.

#### Between-Waves Revive Shop
`PartySystem.reviveMember(member)`: costs `REVIVE_BASE_COST * dungeonFloor` from the dead member's own gold. Restores full HP, clears status effects (player: `clearPlayer() + clearPoison()`; bots: `clearEntity()`), repositions near player.

### Status Effect Cleanup
- **On death**: `StatusFX.clearEntity(entity)` for all members.
- **On revive (player)**: `StatusFX.clearPlayer()` + `StatusFX.clearPoison()` (player has separate poison tracking).
- **On revive (bot)**: `StatusFX.clearEntity(entity)`.
- **On respawn (bot)**: `StatusFX.clearEntity(entity)`.

### Wave Scaling

Scaling uses **total party size** (not alive count) so difficulty does not fluctuate when someone dies mid-wave.

#### Mob Count Scaling
```
scale = 1 + (totalMembers - 1) * MOB_COUNT_SCALE_PER_MEMBER
```
`MOB_COUNT_SCALE_PER_MEMBER = 1.0` means: duo = 2x mobs, trio = 3x, quad = 4x.

#### Mob HP Scaling
```
scale = 1 + (totalMembers - 1) * MOB_HP_SCALE_PER_MEMBER
```
`MOB_HP_SCALE_PER_MEMBER = 0.5` means: duo = 1.5x HP, trio = 2x, quad = 2.5x.

#### Boss Exception
Bosses do **not** scale with party size. Only regular wave mobs use these multipliers.

### Spectator Camera
When the player dies but bots survive, `PartySystem.getSpectateTarget()` returns the nearest alive bot entity. The camera follows that entity until the player respawns or all members die.

## Configuration Reference (`PARTY_CONFIG`)

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_SIZE` | 4 | Maximum party members (1 player + 3 bots) |
| `REVIVE_BASE_COST` | 50 | Gold cost per floor for revive shop |
| `REVIVE_SHOP_DURATION` | 600 | Revive shop open time (10s at 60fps) |
| `BOT_HP_MULT` | 3 | Bot max HP = player maxHp * 3 |
| `BOT_DMG_MULT` | 1 | Bot damage multiplier (1x = same as default gun) |
| `BOT_SHOOT_CD` | 10 | Default shoot cooldown (overridden by gun fireRate) |
| `BOT_MELEE_CD` | 20 | Default melee cooldown (overridden by weapon cooldown) |
| `BOT_FOLLOW_MIN` | 80 | Minimum follow distance (legacy, bots are now autonomous) |
| `BOT_FOLLOW_MAX` | 150 | Maximum follow distance (legacy) |
| `BOT_ENGAGE_RANGE` | 250 | Distance at which bots switch to engage state |
| `BOT_FLEE_THRESHOLD` | 0.15 | HP fraction below which bots flee |
| `BOT_EFFECTIVE_RANGE` | 140 | Ideal shooting distance for gun-focused combat |
| `BOT_SEPARATION_DIST` | 60 | Minimum distance between bots (separation force) |
| `BOT_SPREAD_RADIUS` | 70 | Spread radius for approach angle offsets |
| `MOB_RETARGET_INTERVAL` | 30 | Frames between mob retarget checks |
| `MOB_COUNT_SCALE_PER_MEMBER` | 1.0 | Mob count multiplier per additional member |
| `MOB_HP_SCALE_PER_MEMBER` | 0.5 | Mob HP multiplier per additional member |

## Bot Cosmetic Presets (`BOT_PRESETS`)

Slot 0 is `null` (player). Slots 1-3 are bot cosmetics:

| Slot | Skin | Hair | Shirt | Pants | Eyes | Shoes | Hat |
|------|------|------|-------|-------|------|-------|-----|
| 1 | `#c8a888` | `#3a2a1a` | `#2a4a8a` | `#2a2a3a` | `#44aa66` | `#3a2a1a` | `#2a4a8a` |
| 2 | `#b89878` | `#8a4a2a` | `#8a2a2a` | `#3a2a2a` | `#aa6644` | `#4a3a2a` | `#8a2a2a` |
| 3 | `#d4c4a8` | `#1a1a2a` | `#2a6a4a` | `#2a3a2a` | `#4466aa` | `#2a2a1a` | `#2a6a4a` |

## Connections to Other Systems
- **Authority Tick** — `BotAI.tick()` is called from `authorityTick()` when `PartyState.active`.
- **Combat / Damage System** — `dealDamageToPlayer()` reads `_currentDamageTarget` to route damage to the correct entity. `dealDamageToMob()` is called by bot melee with the bot's entity as the source. Bullets carry `ownerId` for kill attribution via `PartySystem.resolveKiller()`.
- **Mob AI** — `PartySystem.getMobTarget(mob)` replaces direct `player` references in mob AI, returning the nearest alive party member with sticky targeting.
- **Telegraph System** — `BotAI.checkTelegraphDanger()` reads `TelegraphSystem.active` to dodge boss telegraphs.
- **StatusFX** — `StatusFX.tickEntity(entity)` is called per-frame for each bot. Status effects (slow, root, stun, bleed, fear) affect bot movement and actions identically to the player.
- **Shop System** — Bots use `SHOP_ITEMS`, `GUN_TIERS`, `MELEE_TIERS`, `CHEST_TIERS`, `PANTS_TIERS`, `BOOTS_TIERS`, `HELMET_TIERS` for equipment purchasing. Buff purchases use `SHOP_ITEMS.Buffs[]` with per-bot tracking.
- **Inventory System** — Bots have independent `equip` objects. The renderer reads `member.equip.gun` and `member.equip.melee` to draw the correct weapon models.
- **Rendering** — Bot entities are Y-sorted and drawn alongside mobs and the player. Death animation uses `_isDead`, `_deathX`, `_deathY`, `_deathRotation`.
- **Save/Load** — Party state is transient (not saved). Only the player's progression persists. Bot gold earned during a run is lost on exit.

## Gotchas & Rules
- **`member.equip.gun` and `member.equip.melee` MUST stay in sync** with `member.gun` and `member.melee`. The renderer reads from `equip`, not the top-level fields. When buying a new gun/melee via `_applyEquipment()`, both are updated. Any code that modifies `member.gun` or `member.melee` directly must also update `member.equip.gun` / `member.equip.melee`.
- **Wave scaling uses total party size, NOT alive count.** If a bot dies mid-wave, the mob count and HP do not decrease. This prevents exploiting death to lower difficulty.
- **Bosses do not scale with party size.** Only regular wave mobs use `getMobCountScale()` / `getMobHPScale()`.
- **Bot gold is independent.** Bots earn gold from kills (via `ownerId` on bullets) and spend it at the shop autonomously. Player gold is the global variable; bot gold is `member.gold`.
- **Player member uses global references.** Slot 0's `entity` is the global `player`, `gun` is the global `gun`, `melee` is the global `melee`, `equip` is `playerEquip`, `gold` routes to the global `gold` variable. Do not replace these with copies.
- **Status effect cleanup differs by member type.** Player death/revive must call `StatusFX.clearPlayer()` + `StatusFX.clearPoison()` (separate tracking). Bot death/revive uses `StatusFX.clearEntity(entity)`.
- **Bot damage buffs are tracked via `_baseDamage`.** When a bot buys a new gun tier, existing damage buffs from "+3 Gun Damage" purchases are preserved by computing `dmgBuff = gun.damage - gun._baseDamage` and adding it to the new gun's base damage.
- **Bots auto-use potions at < 40% HP.** They also buy potions from the shop when HP < 70% (high priority) or as a low-priority stockpile purchase.
- **`_contactCD` is per-entity.** Each bot entity has its own contact damage cooldown to prevent all bots taking contact damage simultaneously from the same mob.
- **Separation force prevents stacking.** Bots push apart when closer than 60px, using force = `(60 - d) / 60 * 3`. This runs in every state (hunt, engage, flee, shop, roam).
- **`BOT_FOLLOW_MIN` / `BOT_FOLLOW_MAX` are legacy constants.** Bots no longer follow the player — they are fully autonomous hunters. These constants remain in the config but are unused by the current FSM.
