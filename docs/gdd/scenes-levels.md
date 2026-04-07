# Scenes & Levels

## Source of truth

- `js/shared/levelData.js` — `LEVELS` registry: every scene's id, dimensions, collision ASCII, spawns, and entity layouts
- `js/core/sceneManager.js` — active level state, `Scene` state machine, portal registry, leave handlers, queue system, transitions, collision lookup
- `js/core/interactable.js` — generic interactable registry (E-key NPCs/stations) plus station definitions
- `js/core/skeldTasks.js` — Skeld task category registry, per-match task selection, mini-game state tracker

## Purpose

Defines every walkable level in the game, the scene state machine that classifies the active level, the portal/queue plumbing that moves the player between levels, and the interactable/task systems that drive in-level NPCs and Skeld mini-games. `levelData.js` is the authoritative scene list — every scene flag (`isLobby`, `isCave`, etc.) maps one-to-one to a `Scene._current` value (js/core/sceneManager.js:36-56).

## Values

### Tile constant

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| TILE | 48 | pixels | js/shared/levelData.js:5 |

### LEVELS registry — all defined scenes

`LEVELS` is keyed by level id. The scene-flag column maps to the `Scene` state machine string (js/core/sceneManager.js:36-56).

| # | Level id | widthTiles | heightTiles | Scene flag → Scene._current | Spawn (p1) tx,ty | Citation |
|---|----------|-----------:|------------:|-----------------------------|------------------|----------|
| 1 | `lobby_01` | 80 | 64 | `isLobby` → `lobby` | 40,42 | js/shared/levelData.js:18-22 |
| 2 | `house_01` | 40 | 30 | `isFarm` → `farm` | 10,26 | js/shared/levelData.js:214-218 |
| 3 | `cave_01` | 40 | 24 | `isCave` → `cave` | 20,19 | js/shared/levelData.js:266-270 |
| 4 | `azurine_01` | 40 | 24 | `isAzurine` → `azurine` | 20,19 | js/shared/levelData.js:333-337 |
| 5 | `warehouse_01` | 40 | 40 | (none) → `dungeon` | p1 5,20; p2 34,20 | js/shared/levelData.js:392-398 |
| 6 | `azurine_dungeon_01` | 36 | 36 | (none) → `dungeon` | p1 3,18; p2 32,18 | js/shared/levelData.js:456-462 |
| 7 | `mine_01` | 70 | 48 | `isMine` → `mine` | 35,44 | js/shared/levelData.js:509-513 |
| 8 | `mine_02` | 70 | 48 | `isMine` → `mine` | 35,44 | js/shared/levelData.js:590-594 |
| 9 | `mine_03` | 70 | 48 | `isMine` → `mine` | 35,44 | js/shared/levelData.js:663-667 |
| 10 | `mine_04` | 70 | 48 | `isMine` → `mine` | UNKNOWN | js/shared/levelData.js:736-739 |
| 11 | `deli_01` | 40 | 36 | `isCooking` → `cooking` | UNKNOWN | js/shared/levelData.js:811-814 |
| 12 | `diner_01` | 48 | 24 | `isCooking` → `cooking` | UNKNOWN | js/shared/levelData.js:927-930 |
| 13 | `fine_dining_01` | 44 | 26 | `isCooking` → `cooking` | UNKNOWN | js/shared/levelData.js:1068-1071 |
| 14 | `test_arena` | 36 | 28 | `isTestArena` → `test_arena` | UNKNOWN | js/shared/levelData.js:1163-1166 |
| 15 | `gunsmith_01` | 44 | 30 | `isGunsmith` → `gunsmith` | UNKNOWN | js/shared/levelData.js:1204-1207 |
| 16 | `hide_01` | 55 | 42 | `isHideSeek` → `hideseek` | seeker 5,4; hider 45,38 | js/shared/levelData.js:1292, 1485-1489 |
| 17 | `skeld_01` | 135 | 80 | `isSkeld` → `skeld` | (70+XO),18 | js/shared/levelData.js:1499, 1772-1776 |
| 18 | `mafia_lobby` | 50 | 30 | `isMafiaLobby` → `mafia_lobby` | 25,20 | js/shared/levelData.js:1849, 1867-1871 |
| 19 | `vortalis_01` | 40 | 24 | `isVortalis` → `vortalis` | 20,19 | js/shared/levelData.js:1902-1906 |
| 20 | `earth205_01` | 40 | 24 | `isEarth205` → `earth205` | 20,19 | js/shared/levelData.js:1963-1967 |
| 21 | `wagashi_01` | 40 | 24 | `isWagashi` → `wagashi` | 20,19 | js/shared/levelData.js:2024-2028 |
| 22 | `earth216_01` | 40 | 24 | `isEarth216` → `earth216` | 20,19 | js/shared/levelData.js:2079-2083 |
| 23 | `casino_01` | 56 | 40 | `isCasino` → `casino` | UNKNOWN | js/shared/levelData.js:2128-2131 |
| 24 | `spar_hub_01` | 30 | 20 | `isSpar` → `spar` | 15,18 | js/shared/levelData.js:2223-2228 |
| 25 | `spar_1v1_01` | 24 | 20 | `isSpar` + `isSparArena` → `spar` | 4,10 | js/shared/levelData.js:2275-2281 |
| 26 | `spar_2v2_01` | 24 | 20 | `isSpar` + `isSparArena` → `spar` | 4,9 | js/shared/levelData.js:2310-2316 |
| 27 | `spar_3v3_01` | 36 | 28 | `isSpar` + `isSparArena` → `spar` | 5,14 | js/shared/levelData.js:2345-2351 |
| 28 | `spar_4v4_01` | 36 | 28 | `isSpar` + `isSparArena` → `spar` | 5,13 | js/shared/levelData.js:2388-2394 |

> Note: the project descriptor "18 scenes" tracks distinct `Scene` states (lobby, cave, mine, cooking, farm, azurine, gunsmith, test_arena, hideseek, mafia_lobby, skeld, vortalis, earth205, wagashi, earth216, casino, spar, dungeon — js/core/sceneManager.js:36-56). The `LEVELS` registry contains 28 level entries, since several Scene categories map to multiple level ids (mine 1-4, spar hub + 4 arenas, the cooking restaurants, etc.).

### Scene state machine — flag → state mapping

| level flag | Scene._current | Citation |
|------------|----------------|----------|
| (none / null) | `lobby` (default) | js/core/sceneManager.js:34, 38 |
| `isLobby` | `lobby` | js/core/sceneManager.js:39 |
| `isCave` | `cave` | js/core/sceneManager.js:40 |
| `isMine` | `mine` | js/core/sceneManager.js:41 |
| `isCooking` | `cooking` | js/core/sceneManager.js:42 |
| `isFarm` | `farm` | js/core/sceneManager.js:43 |
| `isAzurine` | `azurine` | js/core/sceneManager.js:44 |
| `isGunsmith` | `gunsmith` | js/core/sceneManager.js:45 |
| `isTestArena` | `test_arena` | js/core/sceneManager.js:46 |
| `isHideSeek` | `hideseek` | js/core/sceneManager.js:47 |
| `isMafiaLobby` | `mafia_lobby` | js/core/sceneManager.js:48 |
| `isSkeld` | `skeld` | js/core/sceneManager.js:49 |
| `isVortalis` | `vortalis` | js/core/sceneManager.js:50 |
| `isEarth205` | `earth205` | js/core/sceneManager.js:51 |
| `isWagashi` | `wagashi` | js/core/sceneManager.js:52 |
| `isEarth216` | `earth216` | js/core/sceneManager.js:53 |
| `isCasino` | `casino` | js/core/sceneManager.js:54 |
| `isSpar` | `spar` | js/core/sceneManager.js:55 |
| (no flag, fallthrough) | `dungeon` | js/core/sceneManager.js:56 |

### Lobby (`lobby_01`) building portal entries

All entries below are entities in `lobby_01.entities`. Coordinates are `tx,ty` (tile units), `w×h` is the entrance footprint, and `target`/`spawnTX,spawnTY` define the destination level and spawn tile.

| Building | Entrance type | tx,ty | w×h | target | spawnTX,spawnTY | Citation |
|----------|---------------|-------|-----|--------|-----------------|----------|
| Tower (cave) | `cave_entrance` | 37,8 | 5×2 | `cave_01` | 15,19 | js/shared/levelData.js:97 |
| House | `house_entrance` | 14,7 | 3×2 | `house_01` | 10,26 | js/shared/levelData.js:101 |
| Mine | `mine_entrance` | 52,7 | 3×2 | `mine_01` | 35,44 | js/shared/levelData.js:105 |
| Azurine | `azurine_entrance` | 71,7 | 3×2 | `azurine_01` | 20,19 | js/shared/levelData.js:108 |
| Deli | `deli_entrance` | 5,19 | 3×2 | `deli_01` | 14,30 | js/shared/levelData.js:111 |
| Hide & Seek | `hideseek_entrance` | 16,19 | 3×2 | `hide_01` | 5,5 | js/shared/levelData.js:114 |
| Skeld → Mafia lobby | `skeld_entrance` | 27,19 | 3×2 | `mafia_lobby` | 25,20 | js/shared/levelData.js:117 |
| Gunsmith | `gunsmith_entrance` | 71,19 | 3×2 | `gunsmith_01` | 22,26 | js/shared/levelData.js:120 |
| Casino | `casino_entrance` | 71,31 | 3×2 | `casino_01` | 28,37 | js/shared/levelData.js:123 |
| Vortalis | `vortalis_entrance` | 52,19 | 3×2 | `vortalis_01` | 20,19 | js/shared/levelData.js:126 |
| Earth-205 | `earth205_entrance` | 52,31 | 3×2 | `earth205_01` | 20,19 | js/shared/levelData.js:129 |
| Wagashi | `wagashi_entrance` | 52,43 | 3×2 | `wagashi_01` | 20,19 | js/shared/levelData.js:132 |
| Earth-216 | `earth216_entrance` | 52,55 | 3×2 | `earth216_01` | 20,19 | js/shared/levelData.js:135 |
| Diner | `diner_entrance` | 5,31 | 3×2 | `diner_01` | 27,33 | js/shared/levelData.js:138 |
| Fine Dining | `fine_dining_entrance` | 5,43 | 3×2 | `fine_dining_01` | 40,24 | js/shared/levelData.js:141 |
| Spar | `spar_entrance` | 16,31 | 3×2 | `spar_hub_01` | 15,18 | js/shared/levelData.js:153 |

> Note: the lobby spawn fountain, paths, fishing dock, lamps, benches, tables, energy nodes, flowers, version sign, and crystal/tree props all live at js/shared/levelData.js:91-204.

### Portal type registry — `PORTAL_SCENES`

Maps portal entity `type` → required `Scene` value for the portal to fire (js/core/sceneManager.js:88-112). Player must be in the listed scene for the entrance to trigger `startTransition`.

| Portal type | Required scene | Citation |
|---|---|---|
| `cave_entrance` | `lobby` | js/core/sceneManager.js:89 |
| `cave_exit` | `cave` | js/core/sceneManager.js:89 |
| `mine_entrance` | `lobby` | js/core/sceneManager.js:90 |
| `mine_exit` | `mine` | js/core/sceneManager.js:90 |
| `mine_door` | `mine` | js/core/sceneManager.js:90 |
| `deli_entrance` | `lobby` | js/core/sceneManager.js:91 |
| `deli_exit` | `cooking` | js/core/sceneManager.js:91 |
| `diner_entrance` | `lobby` | js/core/sceneManager.js:92 |
| `diner_exit` | `cooking` | js/core/sceneManager.js:92 |
| `fine_dining_entrance` | `lobby` | js/core/sceneManager.js:93 |
| `fd_exit_door` | `cooking` | js/core/sceneManager.js:93 |
| `house_entrance` | `lobby` | js/core/sceneManager.js:94 |
| `house_exit` | `farm` | js/core/sceneManager.js:94 |
| `azurine_entrance` | `lobby` | js/core/sceneManager.js:95 |
| `azurine_exit` | `azurine` | js/core/sceneManager.js:95 |
| `gunsmith_entrance` | `lobby` | js/core/sceneManager.js:96 |
| `gunsmith_exit` | `gunsmith` | js/core/sceneManager.js:96 |
| `hideseek_entrance` | `lobby` | js/core/sceneManager.js:97 |
| `skeld_entrance` | `lobby` | js/core/sceneManager.js:98 |
| `mafia_lobby_exit` | `mafia_lobby` | js/core/sceneManager.js:99 |
| `vortalis_entrance` / `vortalis_exit` | `lobby` / `vortalis` | js/core/sceneManager.js:100-101 |
| `earth205_entrance` / `earth205_exit` | `lobby` / `earth205` | js/core/sceneManager.js:102-103 |
| `wagashi_entrance` / `wagashi_exit` | `lobby` / `wagashi` | js/core/sceneManager.js:104-105 |
| `earth216_entrance` / `earth216_exit` | `lobby` / `earth216` | js/core/sceneManager.js:106-107 |
| `casino_entrance` / `casino_exit` | `lobby` / `casino` | js/core/sceneManager.js:108-109 |
| `spar_entrance` / `spar_exit` | `lobby` / `spar` | js/core/sceneManager.js:110-111 |

### Lobby-reset scene set

Scenes that call `resetCombatState('lobby')` on entry: `lobby`, `cave`, `azurine`, `gunsmith`, `skeld`, `mafia_lobby`, `vortalis`, `earth205`, `wagashi`, `earth216`, `casino` (js/core/sceneManager.js:115).

### `LEAVE_HANDLERS` (`/leave` command targets)

Each entry: scene → return level + spawn tile + chat message (js/core/sceneManager.js:121-267).

| Scene | returnLevel | returnTX,TY | message | Citation |
|---|---|---|---|---|
| test_arena | `lobby_01` | 40,42 | "Leaving test arena..." | js/core/sceneManager.js:122-134 |
| mine | `lobby_01` | 53,9 | "Leaving mine..." | js/core/sceneManager.js:135-140 |
| cooking | `lobby_01` | 6/6/6, 45/33/21 (per restaurant) | per restaurant | js/core/sceneManager.js:141-159 |
| farm | `lobby_01` | 15,9 | "Leaving farm..." | js/core/sceneManager.js:160-165 |
| cave | `lobby_01` | 39,10 | "Leaving cave..." | js/core/sceneManager.js:166-171 |
| azurine | `lobby_01` | 72,9 | "Leaving Azurine City..." | js/core/sceneManager.js:172-177 |
| vortalis | `lobby_01` | 53,21 | "Leaving Vortalis..." | js/core/sceneManager.js:178-183 |
| earth205 | `lobby_01` | 53,33 | "Leaving Earth-205..." | js/core/sceneManager.js:184-189 |
| wagashi | `lobby_01` | 53,45 | "Leaving Wagashi..." | js/core/sceneManager.js:190-195 |
| earth216 | `lobby_01` | 53,57 | "Leaving Earth-216..." | js/core/sceneManager.js:196-201 |
| gunsmith | `lobby_01` | 72,21 | "Leaving gunsmith..." | js/core/sceneManager.js:202-207 |
| casino | `lobby_01` | 72,33 | "Leaving casino..." | js/core/sceneManager.js:208-214 |
| spar | (handled by SparSystem.endMatch) | n/a | "Left Spar Building." | js/core/sceneManager.js:215-221 |
| dungeon | `dungeonReturnLevel` (defaults `cave_01`) | n/a | "Leaving dungeon..." | js/core/sceneManager.js:222-233 |
| hideseek | (handled by HideSeekSystem.endMatch) | n/a | "Left Hide & Seek." | js/core/sceneManager.js:234-240 |
| mafia_lobby | `lobby_01` | 28,21 | "Leaving Mafia lobby..." | js/core/sceneManager.js:241-249 |
| skeld | `mafia_lobby` | 25,20 | "Leaving The Skeld..." | js/core/sceneManager.js:250-266 |

### Transition timing

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Fade-in alpha step (phase 1) | 0.12 | per frame | js/core/sceneManager.js:386 |
| Fade-out alpha step (phase 2) | 0.08 | per frame | js/core/sceneManager.js:394 |

### Queue system constants

| Name | Value | Citation |
|------|-------|----------|
| `QUEUE_DURATION` | 600 | js/core/sceneManager.js:406 |
| `QUEUE_MAX` | 4 | js/core/sceneManager.js:408 |
| Queue countdown (party mode) | 999999 (open until Start clicked) | js/core/sceneManager.js:532 |

A `queue_zone` entity opens the queue when the player is inside its tile bounds AND the current scene is `cave`, `azurine`, `vortalis`, `earth205`, `wagashi`, or `earth216` (js/core/sceneManager.js:456).

### Sample queue zone (cave)

| Field | Value | Citation |
|---|---|---|
| type | `queue_zone` | js/shared/levelData.js:300 |
| tx,ty | 15,4 | js/shared/levelData.js:300 |
| w,h | 10,5 | js/shared/levelData.js:300 |
| spawnTX,spawnTY | 20,20 | js/shared/levelData.js:300 |
| maxPlayers | 4 | js/shared/levelData.js:300 |
| floorStart | 1 | js/shared/levelData.js:300 |
| dungeonType | `cave` | js/shared/levelData.js:300 |

The `queue_zone` for `azurine_01` mirrors this with `dungeonType: 'azurine'` (js/shared/levelData.js:367). The dungeon-entrance levels (`vortalis_01`, `earth205_01`, `wagashi_01`, `earth216_01`) follow the same pattern in their respective entity blocks.

### House / farm interior (`house_01`)

| Entity | type | tx,ty | w×h | solid | Citation |
|---|---|---|---|---|---|
| Exit to lobby | `house_exit` | 8,27 | 4×3 | false | js/shared/levelData.js:253 |
| Farm zone | `farm_zone` | 2,2 | 36×16 | false | js/shared/levelData.js:255 |
| Farm vendor | `farm_vendor` | 30,21 | 2×2 | true | js/shared/levelData.js:257 |
| Farm table | `farm_table` | 22,21 | 3×2 | true | js/shared/levelData.js:259 |
| Farm bed | `farm_bed` | 35,22 | 2×3 | true | js/shared/levelData.js:260 |
| Farm chest | `farm_chest` | 26,21 | 2×2 | true | js/shared/levelData.js:261 |
| Farm well | `farm_well` | 2,21 | 2×2 | true | js/shared/levelData.js:262 |

### Cave (`cave_01`) interactables

| Entity | tx,ty | w×h | Notes | Citation |
|---|---|---|---|---|
| `cave_exit` | 17,21 | 6×3 | back to lobby spawnTX/TY 39,10 | js/shared/levelData.js:298 |
| `dungeon_door` | 17,1 | 6×3 | top of room | js/shared/levelData.js:299 |
| `queue_zone` | 15,4 | 10×5 | dungeonType `cave` | js/shared/levelData.js:300 |
| Torches (left/right walls + door) | various | 1×1 | 18 instances | js/shared/levelData.js:302-321 |
| Symmetrical rocks | various | 1×1 | 6 instances | js/shared/levelData.js:323-328 |

### Azurine (`azurine_01`) interactables

| Entity | tx,ty | w×h | Citation |
|---|---|---|---|
| `azurine_exit` | 17,21 | 6×3 | js/shared/levelData.js:365 |
| `dungeon_door` | 17,1 | 6×3 | js/shared/levelData.js:366 |
| `queue_zone` (dungeonType `azurine`) | 15,4 | 10×5 | js/shared/levelData.js:367 |
| Neon lights (left/right walls + door) | various | 1×1 | 18 instances | js/shared/levelData.js:369-388 |

### Mine chain — door coordinates

| Level | Door type | tx,ty | w×h | target | Spawn | Citation |
|---|---|---|---|---|---|---|
| `mine_01` | `mine_exit` | 33,45 | 4×3 | `lobby_01` | 53,9 | js/shared/levelData.js:565 |
| `mine_01` | `mine_door` | 33,1 | 4×2 | `mine_02` | 35,44 (label "ROOM 2 →") | js/shared/levelData.js:567 |
| `mine_02` | `mine_door` | 33,45 | 4×2 | `mine_01` | 35,3 (label "← ROOM 1") | js/shared/levelData.js:647 |
| `mine_02` | `mine_door` | 33,1 | 4×2 | `mine_03` | 35,44 (label "ROOM 3 →") | js/shared/levelData.js:649 |

### Mafia lobby (`mafia_lobby`) entities

| Entity | tx,ty | w×h | Citation |
|---|---|---|---|
| `mafia_lobby_laptop` | 10,6 | 3×2 | js/shared/levelData.js:1875 |
| `mafia_lobby_customize` | 37,6 | 3×2 | js/shared/levelData.js:1877 |
| `mafia_lobby_start` | 23,4 | 3×2 | js/shared/levelData.js:1879 |
| `mafia_lobby_crate` × 8 | various | 2×2 | js/shared/levelData.js:1881-1888 |
| `mafia_lobby_crate_sm` × 4 | various | 1×1 | js/shared/levelData.js:1890-1893 |
| `mafia_lobby_exit` | 23,28 | 5×2 | target `lobby_01`, spawnTX/TY 28,21 | js/shared/levelData.js:1895 |

### Spar hub (`spar_hub_01`) doors

| Door | tx,ty | roomId | mode | Citation |
|---|---|---|---|---|
| `spar_room_door` | 3,3 | `spar_1v1` | standard | js/shared/levelData.js:2255 |
| `spar_room_door` | 3,6 | `spar_2v2` | standard | js/shared/levelData.js:2256 |
| `spar_room_door` | 3,9 | `spar_3v3` | standard | js/shared/levelData.js:2257 |
| `spar_room_door` | 3,12 | `spar_4v4` | standard | js/shared/levelData.js:2258 |
| `spar_room_door` | 25,3 | `spar_1v1_streak` | streak | js/shared/levelData.js:2260 |
| `spar_room_door` | 25,6 | `spar_2v2_streak` | streak | js/shared/levelData.js:2261 |
| `spar_room_door` | 25,9 | `spar_3v3_streak` | streak | js/shared/levelData.js:2262 |
| `spar_room_door` | 25,12 | `spar_4v4_streak` | streak | js/shared/levelData.js:2263 |
| `spar_exit` | 14,19 | n/a | target `lobby_01` 17,34 | js/shared/levelData.js:2265 |

## Skeld map

The Skeld is the largest level and follows strict construction rules. **Do not change hallway/corridor positions, widths, or pathing.** Only expand rooms outward into existing wall tiles (CLAUDE.md mandate).

### Skeld dimensions & XO offset

| Name | Value | Citation |
|---|---|---|
| `W` (widthTiles) | 135 | js/shared/levelData.js:1499 |
| `H` (heightTiles) | 80 | js/shared/levelData.js:1499 |
| `XO` (x-offset) | 4 | js/shared/levelData.js:1503 |
| Player spawn | tx = `70 + XO` (= 74), ty = 18 | js/shared/levelData.js:1776 |

`XO` exists so that Reactor can use negative virtual x coordinates (`room(-3, 23, 8, 46)` at js/shared/levelData.js:1540). Actual grid x = virtual x + XO. All `room`, `wall`, `carve`, `hCorridor`, `vCorridor`, `pillar` helpers add XO internally (js/shared/levelData.js:1507-1527).

### Skeld rooms (14 total)

| Room | Virtual coords (x1,y1,x2,y2) | Citation |
|---|---|---|
| Cafeteria | 57,1,84,34 (28×34) | js/shared/levelData.js:1534 |
| Upper Engine | 1,1,23,17 (23×17) | js/shared/levelData.js:1537 |
| Reactor | -3,23,8,46 (12×24) | js/shared/levelData.js:1540 |
| Security | 24,24,36,41 (13×18) | js/shared/levelData.js:1543 |
| MedBay | 38,18,53,32 (16×15) | js/shared/levelData.js:1546 |
| Electrical | 37,42,55,62 (19×21) | js/shared/levelData.js:1549 |
| Admin | 78,37,96,54 (19×18) | js/shared/levelData.js:1552 |
| Storage | 58,53,75,78 (18×26) | js/shared/levelData.js:1555 |
| Shields | 99,54,117,70 (19×17) | js/shared/levelData.js:1558 |
| Communications | 80,67,97,78 (18×12) | js/shared/levelData.js:1561 |
| Lower Engine | 1,52,23,68 (23×17) | js/shared/levelData.js:1564 |
| Weapons | 95,1,115,17 (21×17, arrow) | js/shared/levelData.js:1567 |
| O2 | 86,22,99,35 (14×14) | js/shared/levelData.js:1576 |
| Navigation | 117,24,129,44 (13×21, arrow) | js/shared/levelData.js:1579 |

### Skeld corridors (all 5 tiles wide unless noted)

| Corridor | Virtual rect | Citation |
|---|---|---|
| Upper Engine → Cafeteria | 23,8,57,12 | js/shared/levelData.js:1718 |
| Cafeteria → Weapons | 84,9,95,13 | js/shared/levelData.js:1719 |
| Corridor → MedBay | 42,12,46,18 | js/shared/levelData.js:1722 |
| Vertical engine spine (UE↓LE) | 14,17,18,52 | js/shared/levelData.js:1725 |
| Spine → Reactor (left) | 8,32,14,36 | js/shared/levelData.js:1728 |
| Spine → Security (right) | 18,32,24,36 | js/shared/levelData.js:1729 |
| Cafe ↓ Storage | 68,34,72,53 | js/shared/levelData.js:1732 |
| LE↔Storage Z (bottom) | 30,67,58,71 | js/shared/levelData.js:1735 |
| LE↔Storage Z (vertical) | 30,58,34,67 | js/shared/levelData.js:1736 |
| LE↔Storage Z (top) | 23,58,30,62 | js/shared/levelData.js:1737 |
| Electrical → Z corridor | 39,62,43,67 | js/shared/levelData.js:1740 |
| Corridor → Admin | 72,42,78,46 | js/shared/levelData.js:1743 |
| Storage → Shields | 75,58,99,62 | js/shared/levelData.js:1746 |
| Hallway → Comms | 85,62,89,67 | js/shared/levelData.js:1749 |
| Shields → right wing seg 1 (4 wide) | 102,34,105,54 | js/shared/levelData.js:1752 |
| Right wing seg 2 | 105,34,113,37 | js/shared/levelData.js:1753 |
| Right wing seg 3 | 110,26,113,37 | js/shared/levelData.js:1754 |
| Right wing seg 4 | 98,26,113,29 | js/shared/levelData.js:1755 |
| Seg 3 → Navigation (4 wide) | 113,30,117,33 | js/shared/levelData.js:1758 |
| Seg 4 → Weapons (4 wide) | 101,17,104,25 | js/shared/levelData.js:1761 |

### Skeld interactables — counts

| Interactable group | Count | Citation |
|---|---|---|
| Emergency table (cafeteria) | 1 | js/shared/levelData.js:1780 |
| Common tasks | 4 (`tap_sequence`, `code_entry`, `simple_math`, `match_symbol`) | js/shared/levelData.js:1783-1786 |
| Short tasks | 5 (`slider_alignment`, `security_auth`, `hold_to_charge`, `rotate_pipes`, `calibrate_dial`) | js/shared/levelData.js:1789-1793 |
| Long task: `circuit_paths` | 3 steps (electrical → admin → security) | js/shared/levelData.js:1797-1799 |
| Long task: `sample_analyzer` | 1 step (medbay) | js/shared/levelData.js:1801 |
| Long task: `path_trace` | 2 steps (admin → navigation) | js/shared/levelData.js:1803-1804 |
| Long task: `package_assembly` | 2 steps (storage → comms) | js/shared/levelData.js:1806-1807 |
| Long task: `empty_trash` | 2 steps (comms → storage) | js/shared/levelData.js:1809-1810 |
| Security cameras console | 1 (security) | js/shared/levelData.js:1813 |
| Wall camera mounts | 4 (hallway, xroads, admin, lower) | js/shared/levelData.js:1816-1819 |
| Sabotage panels | 6 (reactor ×2, lights, O2 ×2, plus electrical box) | js/shared/levelData.js:1822-1827 |
| Vents | 11 across 4 networks | js/shared/levelData.js:1830-1842 |

### Skeld task taxonomy (`SkeldTasks`)

`TASK_CATEGORIES` (js/core/skeldTasks.js:6-24):

| taskId | Category | Citation |
|---|---|---|
| `tap_sequence` | common | js/core/skeldTasks.js:8 |
| `code_entry` | common | js/core/skeldTasks.js:9 |
| `simple_math` | common | js/core/skeldTasks.js:10 |
| `match_symbol` | common | js/core/skeldTasks.js:11 |
| `slider_alignment` | short | js/core/skeldTasks.js:13 |
| `security_auth` | short | js/core/skeldTasks.js:14 |
| `hold_to_charge` | short | js/core/skeldTasks.js:15 |
| `rotate_pipes` | short | js/core/skeldTasks.js:16 |
| `calibrate_dial` | short | js/core/skeldTasks.js:17 |
| `circuit_paths` | long | js/core/skeldTasks.js:19 |
| `sample_analyzer` | long | js/core/skeldTasks.js:20 |
| `path_trace` | long | js/core/skeldTasks.js:21 |
| `package_assembly` | long | js/core/skeldTasks.js:22 |
| `empty_trash` | long | js/core/skeldTasks.js:23 |

### Default task selection per match

`SkeldTasks.reset(settings)` picks: `commonTasks` (default 1), `shortTasks` (default 2), `longTasks` (default 1), shuffled per category (js/core/skeldTasks.js:50-67). When called with no settings, all category lists are used in full (js/core/skeldTasks.js:50-52).

### Interactable system (E-key NPCs / stations)

`registerInteractable(def)` (js/core/interactable.js:10-13). Each interactable has `id, x, y, range, label, type, canInteract, onInteract`. `getNearestInteractable` picks the closest in-range entry for which `canInteract()` is true (js/core/interactable.js:15-26).

| Interactable id | Active scene | Position (px) | Range | UI panel | Citation |
|---|---|---|---|---|---|
| `shop_station` | dungeon (waveState ≠ 'active') | station.x/y (tile 20,16) | 220 | `shop` | js/core/interactable.js:38-55 |
| `fish_vendor` | lobby (no active fishing) | tile 33,56 center | 120 | `fishVendor` | js/core/interactable.js:64-73 |
| `farm_vendor` | farm | tile 30,21 center | 120 | `farmVendor` | js/core/interactable.js:76-85 |
| `gunsmith_npc` | gunsmith | tile 19,10 center | 120 | `gunsmith` | js/core/interactable.js:88-97 |
| `forge_npc` | gunsmith | tile 34,15 center | 120 | `forge` | js/core/interactable.js:100-109 |
| `mining_npc` | mine | tile 37,42 center | 120 | `miningShop` | js/core/interactable.js:112-120 |

> Note: `interactable.js` continues past line 120 with additional interactable registrations (cooking NPCs, etc.) — only the first 120 lines were inspected for this cluster.

### Portal spawn auto-resolver

A self-invoking IIFE at the bottom of `levelData.js` (js/shared/levelData.js:2445-2467) walks every level entity with a `target`, finds the partner portal in the target level (a portal whose `target` points back), and computes:

- `entity.spawnTX = floor(partner.tx + partner.w / 2)` (js/shared/levelData.js:2458)
- `entity.spawnTY = partner.ty - 1` if partner is past mid-Y, else `partner.ty + partner.h` (js/shared/levelData.js:2460-2464)

This means hand-written `spawnTX/spawnTY` on entrances are overwritten at load time when a partner exit exists.

## Behavior

1. **Boot**: `setLevel(LEVELS.lobby_01)` runs at the bottom of sceneManager (js/core/sceneManager.js:590). This populates `level`, `collisionGrid`, `levelEntities`, `MAP_W`, `MAP_H`, and calls `Scene._update()` which sets `Scene._current` to `lobby` from the `isLobby` flag (js/core/sceneManager.js:20-28, 36-56).
2. **Per-frame portal scan**: `checkPortals()` iterates `levelEntities`. For each entity whose type appears in `PORTAL_SCENES`, if the player tile (`player.x/TILE`, `player.y/TILE`) is inside the entity's `tx,ty,w,h` rect AND `Scene.is(requiredScene)`, it calls `startTransition(e.target, e.spawnTX, e.spawnTY)` (js/core/sceneManager.js:425-455).
3. **Restaurant gating**: For `diner_entrance` / `fine_dining_entrance`, `COOKING_SHOPS[shopId].levelReq` is checked against `skillData.Cooking.level`. If below requirement (and not in `_opMode`), the transition is skipped and a "Requires Cooking Lv X" hit effect is pushed (js/core/sceneManager.js:437-452).
4. **Queue zones**: `queue_zone` entities only register `nearQueue = true` when player is in the zone AND scene is `cave`, `azurine`, `vortalis`, `earth205`, `wagashi`, or `earth216` (js/core/sceneManager.js:456). The zone's `dungeonType` is looked up in `DUNGEON_REGISTRY` to populate `queueDungeonId/SpawnTX/TY/ReturnLevel`.
5. **Stairs**: When `stairsOpen && Scene.inDungeon`, `nearStairs` is set if player tile is within ±2 of `(level.widthTiles/2, level.heightTiles/2)` (js/core/sceneManager.js:473-480).
6. **`startTransition`**: Sets `transitionTarget`, `transitionSpawnTX/TY`, `transitionPhase = 1`, `transitionAlpha = 0`. Returns immediately if a transition is already in progress (js/core/sceneManager.js:373-381).
7. **`updateTransition`**: Phase 1 fades alpha in by 0.12 per frame (js/core/sceneManager.js:386). When alpha ≥ 1, calls `enterLevel` and switches to phase 2. Phase 2 fades alpha out by 0.08 per frame (js/core/sceneManager.js:394).
8. **`enterLevel`**: Runs the leaving scene's cleanup (skipping spar→spar intra-transitions), calls `setLevel(targetLevel)`, places `player.x/y` at `spawnTX*TILE+TILE/2`, repositions party bots, closes UI, clears `mobs/bullets/hitEffects/medpacks`, resets queue, then dispatches per-scene reset/init: test_arena, lobby-reset set, mine, cooking (with restaurant id branch), farm, hideseek, spar, or default dungeon path (js/core/sceneManager.js:286-371).
9. **Cooking restaurant id**: After `setLevel`, `enterLevel` reads `targetLevel.id` and sets `cookingState.activeRestaurantId` to `'diner'`, `'fine_dining'`, or `'street_deli'`, then calls the matching init function (js/core/sceneManager.js:332-341).
10. **`/leave` command**: `handleLeave()` looks up `LEAVE_HANDLERS[Scene.current]`, runs cleanup, calls `startTransition(handler.returnLevel, handler.returnTX, handler.returnTY)` if a return level is set, and pushes a SYSTEM chat message (js/core/sceneManager.js:269-276).
11. **Queue join**: `joinQueue` checks `DUNGEON_REGISTRY[queueDungeonType].requiredLevel` against player's dungeon level (unless `_opMode`). If below requirement, prints SYSTEM chat error and aborts. Otherwise sets `queueActive = true`, `queuePlayers = 1`, `queueTimer = 999999`, and snaps the player to the first sigil position (js/core/sceneManager.js:508-545).
12. **Queue start**: `startDungeon` counts filled `PartyState.queueSlots`, calls `PartySystem.init(slotCount)`, then `enterLevel(queueDungeonId, queueSpawnTX, queueSpawnTY)` (js/core/sceneManager.js:548-559).
13. **Floor advance**: `goToNextFloor` increments `dungeonFloor`, calls `resetCombatState('floor')`, looks up `DUNGEON_REGISTRY[currentDungeon].spawnTX/TY`, repositions player, triggers a fade-out transition, pushes a "FLOOR N" hit effect, and emits `floor_changed` (js/core/sceneManager.js:483-506).
14. **Collision lookup**: `isSolid(col, row)` returns true outside the grid, on a `1` tile, or on any solid entity whose `tx,tx+w` × `ty,ty+h` rect contains the cell (js/core/sceneManager.js:574-587).
15. **Skeld task lifecycle**: `SkeldTasks.reset(settings)` collects all `skeld_task` entities from `LEVELS.skeld_01`, groups by `TASK_CATEGORIES`, picks `wantCommon/short/long` per shuffle, initializes `_state[taskId] = { done, stepsCompleted, totalSteps }` where `totalSteps` is the entity count for that taskId (js/core/skeldTasks.js:33-78). `completeStep(taskId, step)` adds to `stepsCompleted`; if size ≥ totalSteps the task is marked done (js/core/skeldTasks.js:80-90).

## Dependencies

- Reads: `LEVELS` registry (`js/shared/levelData.js`), `TILE`, `collisionFromAscii`
- Reads / writes: `level`, `collisionGrid`, `levelEntities`, `MAP_W`, `MAP_H`, `placedTiles` (module-scoped in sceneManager)
- Reads: `player.x/y/vx/vy`, `mobs`, `bullets`, `hitEffects`, `medpacks`, `deathEffects`, `mobParticles` from `js/authority/gameState.js`
- Reads: `PartyState`, `PartySystem` from party system; `cookingState`, `COOKING_SHOPS`, `skillData` for restaurant gating; `DUNGEON_REGISTRY` for queue lookups; `dungeonFloor`, `dungeonReturnLevel`, `currentDungeon`, `getDungeonMaxFloors` from waveSystem/gameState
- Reads: `TelegraphSystem`, `HazardSystem`, `StatusFX`, `SparSystem`, `HideSeekSystem`, `MafiaState`, `VentSystem`, `closeMafiaSettingsPanel`, `closeMafiaColorPicker`, `closeTaskPanel`, `casinoReset`, `initDeliNPCs`, `initDinerNPCs`, `initFineDiningNPCs`, `initFarmState`, `resetCombatState`, `getDungeonLevel`, `keybinds`, `getKeyDisplayName`, `UI`
- Writes: `chatMessages` (system messages on leave), `gold = 0` on dungeon cleanup
- Emits: `scene_changed { from, to }` on `Scene._update` transition (js/core/sceneManager.js:58); `floor_changed { floor }` on `goToNextFloor` (js/core/sceneManager.js:505)

## Edge cases

- **`Scene._update` is called from `setLevel`** — but if `level` is null on first call, `_current` falls back to `lobby` (js/core/sceneManager.js:38). The scene state may be stale until the next `setLevel` if downstream code mutates `level` directly.
- **Default dungeon classification**: any level lacking every recognized flag falls into `dungeon` (js/core/sceneManager.js:56). New scene types must add both a flag check and an `inXxx` getter to avoid being misclassified.
- **`enterLevel` runs leaving cleanup automatically** — unless transitioning between two `isSpar` levels, in which case spar cleanup is skipped to preserve loadout (js/core/sceneManager.js:290-292).
- **Portal spawn auto-resolver overrides hand-written values**: if both portals declare `spawnTX/spawnTY`, the value computed from the partner wins (js/shared/levelData.js:2445-2467). Hand-tuned portals must avoid having a partner with `target` pointing back, or the resolver will overwrite them.
- **Skeld `XO=4` virtual coordinates**: every `room`, `wall`, `carve`, `pillar`, `hCorridor`, `vCorridor`, `hCorridor3`, `vCorridor3` call adds XO internally. Reading raw entity `tx` values for skeld interactables means actual grid x = `tx + 4` since each entity definition stores `tx + XO` literally (js/shared/levelData.js:1780, 1783, ...).
- **`OP mode` (`window._opMode`)** bypasses both restaurant Cooking-level gating (js/core/sceneManager.js:442) and dungeon-level gating in `joinQueue` (js/core/sceneManager.js:512).
- **Cooking `LEAVE_HANDLERS` returnTY** branches on `cookingState.activeRestaurantId` via getters, so the leave coordinate changes between deli (21), diner (33), and fine_dining (45) (js/core/sceneManager.js:149-153).
- **Spar leave** sets `returnLevel: null` so `handleLeave` does not call `startTransition`; instead `SparSystem.endMatch()` handles its own transition (js/core/sceneManager.js:215-221, 273). Same pattern for hideseek (js/core/sceneManager.js:234-240).
- **Dungeon `returnLevel` is dynamic** — uses the global `dungeonReturnLevel` or falls back to `cave_01` (js/core/sceneManager.js:231).
- **`joinQueue` toggles** — if already in queue, clicking again leaves the queue and decrements `queuePlayers` (js/core/sceneManager.js:519-527).
- **`startTransition` early-out** — if a transition is already running, new portal contacts are ignored (js/core/sceneManager.js:374), preventing portal "ping-pong".
- **`SkeldTasks.reset` with no `settings`** uses each category's full list as the want count, effectively making all tasks active (js/core/skeldTasks.js:50-52).
- **`mine_04` spawn** is declared with the same shape as mine_01-03 but specific spawn coords were not extracted in this audit pass — see UNKNOWN entries.
- **`interactable.js`** continues past line 120 with cooking NPCs and other registrations not catalogued in this pass.
- **Lobby fishing dock** (`fishing_spot` at tx:37,ty:58 w:5×3, js/shared/levelData.js:203) sets `nearFishingSpot = true` only when scene is `lobby` (js/core/sceneManager.js:467-469).
