# Phase 2: HUD + Death Flow + Chat — Design Spec

**Date:** 2026-04-13
**Phase:** 2 of 10
**Depends on:** Phase 1c (dungeon run loop working)
**Exit gate:** Play a dungeon run, see all HUD elements update in real-time. Die and see death screen with countdown. Clear dungeon and see victory. Use chat commands to debug.

## Overview

Expand the placeholder HUD to match the JS game's layout and behavior. All elements are functional placeholders — visual polish and final art come in Phase 6. Positions, sizes, and colors match `js/core/draw.js` HUD rendering at BASE_W=1920, BASE_H=1080 (scaled to screen height).

## Approach

- **CombatHUD.cs (OnGUI)**: Rewrite to match JS layout — HP bar, lives, wave info, kills, gold, hotbar, gun/melee panels, death overlay with all 3 phases.
- **ChatSystem.cs (Canvas + InputField)**: New script for text input. Canvas-based because OnGUI TextField is insufficient for real text editing.
- **WaveSystem.cs**: Minor additions to expose mob count and wave state for HUD consumption.

## HUD Elements — Exact JS Layout

All positions reference JS coordinate space (BASE_W=1920, BASE_H=1080). Unity OnGUI scales via `Screen.height / 1080f`.

### 1. Player HP Bar (top center)

**Source:** js/core/draw.js HUD section
**Position:** Centered at BASE_W/2, Y: 16
**Size:** 360×24 (panel extends to 372×36 with padding)

- Background panel: `rgba(0,0,0,0.6)`, 6px rounded rect at (774, 10) size 372×36
- HP fill: width = `(hp / maxHp) * 360`
  - Green `#4a4` when hp > 50%
  - Orange `#e80` when hp 25-50%
  - Red `#f44` when hp < 25%
  - Critical flash: alternate `#f66` every 300ms when < 25%
- Border: `rgba(255,255,255,0.25)`, 2px
- Text: "[hp] / [maxHp]", `bold 18px monospace`, white, centered

### 2. Lives Display (left of HP bar, dungeon only)

**Source:** js/core/draw.js HP bar section
**Position:** X: hpBarX - 110 + i*32, Y: hpBarY + 22

- 3 heart symbols "♥" in `30px monospace`
- Filled: `#e33`, Empty: `#333`
- Show `CombatState.lives` filled hearts, rest empty

### 3. Wave HUD (top center, below HP bar, dungeon only)

**Source:** js/core/draw.js wave HUD section
**Position:** Center X, starting Y: 56

#### Floor indicator
- Text: "FLOOR [n] / 5", `bold 14px monospace`, `#b090e0`

#### Wave state (Y: 86, bold 30px monospace, center)

State machine matches JS exactly:

| WaveSystem State | Text | Color | Subtitle |
|-----------------|------|-------|----------|
| `dungeonComplete && stairsOpen` | "DUNGEON COMPLETE!" | `#ffd700` | "All [total] waves cleared! Find the exit!" |
| `stairsOpen` (not complete) | "FLOOR CLEAR!" | `#b080ff` | "Find the staircase" in `#aaa` |
| `waveState == "cleared"` | "NEXT WAVE IN [sec]" | `#fa0` | "[G] Skip • Wave X/Y" in `#aaa` |
| `waveState == "active"` | "WAVE [global]/[total]" | `#fff` (boss: `#ff4444`) | Theme in `#fa0`, "[count] remaining" in `#aaa` |
| other (between waves) | "GET READY... [sec]" | `#888` | "[G] Skip" in `#aaa` |

- `global` wave = `(floor - 1) * 10 + wave`
- `total` = `MAX_FLOORS * WAVES_PER_FLOOR` = 50
- Boss waves (5, 10): red text + red theme

### 4. Kills Counter (top right)

**Source:** js/core/draw.js kills section
**Position:** X: BASE_W - 24, right-aligned

- Label: "KILLS", `bold 18px monospace`, `#888`, Y: 30
- Value: `bold 32px monospace`, `#fff`, Y: 62

### 5. Gold Display (center area, dungeon only)

**Source:** js/core/draw.js gold section
**Position:** Center-left, Y: 140

- Gold coin icon: circle radius 12 at (BASE_W/2 - 50, 140), fill `#ffc107`, inner `#e6a800`, "G" letter
- Amount: "[gold]g", `bold 20px monospace`, `#ffc107`, X: BASE_W/2 + 10, Y: 147

### 6. Gun HUD Panel (right side, when activeSlot == 0)

**Source:** js/core/draw.js gun HUD, inventory.js:1753-1856
**Position:** X: BASE_W - 230, Y: BASE_H/2 - 110
**Size:** 130×220

- Background: `rgba(0,0,0,0.6)`, border `rgba(255,255,255,0.15)` 1px
- Gun name: `bold 13px monospace`, `#fa0` (placeholder — no tiers yet), Y: +16
- Ammo: "[ammo]/[magSize]", `bold 18px monospace`, center, Y: +78
  - Reloading: "R.." in `#fa0`
  - Low ammo (<5): `#f44`
  - Normal: `#fff`
- Reload progress bar (if reloading): Y: +84, 4px tall, `#fa0` fill
- Stats (placeholder): DMG/MAG/RATE bars, `bold 10px`, colors `#f66`/`#4cf`/`#fa0`, Y: +96
  - Bar width 55px max, scaled to current value / max (DMG/60, MAG/100, RATE/30)
- Footer: "[R] Reload", `bold 9px`, `rgba(255,255,255,0.35)`, Y: +213

### 7. Melee HUD Panel (right side, when activeSlot == 1)

**Source:** js/core/draw.js melee HUD
**Position:** Same as Gun HUD (only one shows at a time)
**Size:** 130×180

- Background: same as gun HUD
- Melee name: "Katana", `bold 12px monospace`, `#aaa`, Y: +16
- Stats: DMG/RNG/SPD/CRIT, `bold 10px`, colors `#f66`/`#4cf`/`#4f4`/`#c8f`, Y: +42
  - Values: [dmg], [range]px, [speed]/s, [crit]%
  - Bar width 55px, max scales: 150/160/4/50
- Footer: "[Click] Swing", `9px monospace`, `rgba(255,255,255,0.3)`, Y: +170

### 8. Hotbar (5 slots, right side vertical)

**Source:** js/core/draw.js hotbar section
**Position:** X: BASE_W - 68, Y: BASE_H/2 - 175 (right side default)
**Slot size:** 64×64, gap 6px, vertical layout

| Slot | Label | State |
|------|-------|-------|
| 1 | Gun | Active (functional) |
| 2 | Melee | Active (functional) |
| 3 | Potion | Locked (grayed, Phase 3) |
| 4 | Item | Locked (grayed, Phase 3) |
| 5 | Grab | Locked (grayed, Phase 3) |

**Slot styling:**
- Active: bg `rgba(80,200,120,0.25)`, border `#4a9eff` 2.5px
- Normal: bg `rgba(0,0,0,0.6)`, border `rgba(255,255,255,0.15)`
- Locked: bg `rgba(20,20,30,0.6)`, border `rgba(80,80,120,0.3)`, "—" text center

**Key number:** top-left, `bold 12px monospace`
- Active: `#4a9eff`, inactive: `#666`

**Slot content (placeholder):**
- Gun: text "GUN" centered, `#fa0`
- Melee: text "MEL" centered, `#aaa`
- Potion: text "POT" centered, `#555`
- Item: text "—" centered, `#444`
- Grab: text "—" centered, `#444`

**Ammo badge (active gun slot):** "[ammo]/[mag]", `bold 11px`, bottom center

### 9. Death Overlay (3 phases)

**Source:** js/core/draw.js death overlay section
**Citations:** js/authority/damageSystem.js:530-531

Full-screen overlay: `rgba(0,0,0,0.5)`

#### Phase 1: YOU DIED (deathTimer > 0, duration = 40f/60 = 0.667s)
- Shadow text: `bold 36px`, `#cc2222`, offset by `sin(deathTimer * 30) * 3` (shake)
- Main text: `bold 34px`, `#ff4444`, center screen Y: BASE_H/2 - 20

#### Phase 2: Respawn Countdown (deathTimer <= 0, respawnTimer > 0, lives > 0)
- "Respawning in": `bold 16px`, `#aaa`, Y: BASE_H/2 - 40
- Countdown digit: `bold 64px`, `#fff`, Y: BASE_H/2 + 20, scale pulse `1 + sin(time/150) * 0.08`
- Lives: "♥♥♥ [n] lives left" or "♥ LAST LIFE", `bold 14px`, `#e44`, Y: BASE_H/2 + 70

#### Phase 3: Game Over (0 lives)
- "GAME OVER": `bold 28px`, `#cc2222`, Y: BASE_H/2 - 40
- "Returning to lobby...": `bold 16px`, `#aaa`, Y: BASE_H/2

### 10. Mob HP Bars (world-space, above mobs)

**Source:** js/core/draw.js mob rendering section
**Already exists in CombatHUD.cs** — keep as-is. 40px×5px bars, red→green, skip dead and full-HP mobs.

## Chat System — New Script

### ChatSystem.cs

**Source:** js/client/ui/panelManager.js:48, :509-891, :902-972

**Architecture:** Canvas GameObject with:
- InputField (bottom of screen)
- ScrollView for message history
- Semi-transparent background panel

**Layout (matching JS chat panel area):**
- Panel: bottom-left, 400×300, bg `rgba(8,8,14,0.85)`
- Input field: bottom of panel, 380×28, `rgba(20,20,30,0.9)` bg
- Messages: scroll area above input, `13px monospace`
- Max messages: 50 (ring buffer, js/client/ui/panelManager.js:902)
- Max input length: 80 chars (js/client/ui/panelManager.js:912)

**Toggle:** Tab key (default chat keybind, js/client/ui/settings.js:16)
- Open: focus input, show panel
- Close: unfocus, hide panel (or fade to transparent)
- While open: block movement input (JS: `chatInputActive` blocks movement commands)

**Debug Commands:**

| Command | Effect | JS Citation |
|---------|--------|------------|
| `/heal` | `CombatState.hp = CombatState.maxHp` | panelManager.js:529 |
| `/gold [n]` | `CombatState.gold += n` (default 500) | panelManager.js:509 |
| `/gun <id> [tier] [level]` | Log only (equipment not implemented yet) | panelManager.js:799 |
| `/wave [n]` | `WaveSystem.SkipToWave(n)` | panelManager.js:514 |
| `/floor [n]` | `WaveSystem.SkipToFloor(n)` | panelManager.js:599 |

**Message format:**
- System messages: `#ffd700` (gold color)
- Player messages: `#fff` with `[You]:` prefix
- Error messages: `#ff4444`

## WaveSystem.cs Additions

Expose data for HUD consumption:

- `GetAliveCount()` — count of non-dead mobs in current wave
- `GetTotalSpawned()` — total mobs spawned across all phases of current wave
- `GetGlobalWave()` — `(floor - 1) * WAVES_PER_FLOOR + wave`
- `GetTotalWaves()` — `MAX_FLOORS * WAVES_PER_FLOOR` (50)
- `GetWaveCountdownSec()` — seconds until next wave starts (for "GET READY" / "NEXT WAVE IN" display)
- `SkipToWave(n)` — debug: advance to wave n
- `SkipToFloor(n)` — debug: advance to floor n
- `isBossWave` — true when wave == 5 or wave == 10

## CombatState.cs Additions

- Block player movement input while chat is open (add `isChatOpen` flag check to PlayerController)

## Scripts Modified

| Script | Changes |
|--------|---------|
| CombatHUD.cs | Full rewrite of OnGUI to match JS layout |
| WaveSystem.cs | Add public getters + debug skip methods |
| CombatState.cs | Minor — expose any missing state |
| PlayerController.cs | Block movement when chat open |
| GameBootstrap.cs | Add ChatSystem to bootstrap |

## Scripts Created

| Script | Purpose |
|--------|---------|
| ChatSystem.cs | Canvas-based chat input + message display + debug commands |

## What Is NOT In Phase 2

- Party HUD (Phase 4)
- Spectator overlay (Phase 4)
- Revive shop overlay (Phase 4)
- Charge bars / ultimate HUDs (Phase 7)
- Full gun/melee weapon art icons (Phase 3)
- Tier color bars on hotbar (Phase 3)
- Potion/Item/Grab slot functionality (Phase 3)
- Debug flags HUD, speed tracker, debug overlay (Phase 6)
- Zone transition labels (Phase 6)
- Interactable prompts (Phase 3+)
- Settings panel, inventory panel, all other panels (Phase 6)

## Verification

Play a full dungeon run and confirm:
1. HP bar shows correct health, changes color at thresholds
2. Lives hearts decrement on death
3. Wave info shows correct floor/wave/state with all 5 text states
4. Mob count shows "X remaining" during active waves
5. Kills counter increments on kill
6. Gold display updates on kill reward
7. Hotbar shows 5 slots, active slot highlighted, slots 3-5 grayed
8. Gun HUD shows ammo, reload bar, basic stats
9. Melee HUD shows basic stats when slot 2 active
10. Death overlay: shaking "YOU DIED" → countdown digit → lives text
11. Game over: "GAME OVER" → "Returning to lobby..."
12. Chat: Tab opens, type message, see echo, `/heal` restores HP, `/gold` adds gold, `/wave 5` skips wave, `/floor 3` skips floor
13. Movement blocked while chat input focused
