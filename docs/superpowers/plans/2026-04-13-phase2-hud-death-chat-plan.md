# Phase 2: HUD + Death Flow + Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the placeholder HUD to match JS draw.js layout (HP bar, lives, wave states, hotbar, gun/melee panels, death overlay) and add a Canvas-based chat with 5 debug commands.

**Architecture:** CombatHUD.cs gets a full rewrite matching JS positions at 1920×1080 scaled to screen. ChatSystem.cs is a new Canvas-based script for text input + debug commands. WaveSystem.cs gets public getters and debug skip methods. PlayerController.cs blocks movement when chat is open.

**Tech Stack:** Unity 6 (6000.4.0f1), C#, OnGUI for HUD, Canvas uGUI for chat

**Unity project path:** `C:\Users\jeff\Desktop\Unity Proj\TeahOnline`
**JS source path:** `C:\Users\jeff\Desktop\Teah Online`
**Design spec:** `docs/superpowers/specs/2026-04-13-phase2-hud-death-chat-design.md`

---

### Task 1: WaveSystem Public Getters + Debug Skip Methods

**Files:**
- Modify: `Assets/Scripts/WaveSystem.cs`

The HUD and chat need to read wave state and skip waves/floors. Add public methods.

- [ ] **Step 1: Add public getters for HUD consumption**

Add these methods after `GetGoldReward` (around line 202):

```csharp
// === HUD getters ===

public int GetAliveCount() => CountAliveMobs();

public int GetTotalSpawned()
{
    var mobs = MobManager.Instance?.activeMobs;
    return mobs != null ? mobs.Count : 0;
}

public int GetGlobalWave() => (dungeonFloor - 1) * WAVES_PER_FLOOR + wave;

public int GetTotalWaves() => MAX_FLOORS * WAVES_PER_FLOOR; // 50

public bool IsBossWave() => wave == 5 || wave == 10;

public float GetBetweenWaveTimer() => betweenWaveTimer;
```

- [ ] **Step 2: Add debug skip methods for chat commands**

Add after `OnGameOver` (around line 475):

```csharp
// === Debug commands (chat) ===

public void DebugSkipToWave(int targetWave)
{
    if (!isActive) return;
    // Clear current mobs
    MobManager.Instance?.ClearAll();
    BulletManager.Instance?.ClearAll();
    ClearMedpacks();
    wave = Mathf.Clamp(targetWave - 1, 0, WAVES_PER_FLOOR); // SpawnWave increments
    waveState = "between_waves";
    betweenWaveTimer = 0.5f;
    ResetPhaseState();
    Debug.Log($"[WaveSystem] Debug: skipping to wave {targetWave}");
}

public void DebugSkipToFloor(int targetFloor)
{
    if (!isActive) return;
    int clamped = Mathf.Clamp(targetFloor, 1, MAX_FLOORS);
    dungeonFloor = clamped;
    wave = 0;
    stairsOpen = false;
    DestroyStaircase();
    ClearMedpacks();
    ResetPhaseState();
    MobManager.Instance?.ClearAll();
    BulletManager.Instance?.ClearAll();
    CombatState.Instance?.ResetForFloor();
    waveState = "between_waves";
    betweenWaveTimer = 1f;
    ShowMessage($"Floor {dungeonFloor} - GET READY");
    Debug.Log($"[WaveSystem] Debug: skipping to floor {clamped}");
}
```

- [ ] **Step 3: Verify compilation**

Run Unity MCP `read_console` to check for errors.

- [ ] **Step 4: Commit**

```bash
git add Assets/Scripts/WaveSystem.cs
git commit -m "Phase 2 task 1: WaveSystem public getters + debug skip methods"
```

---

### Task 2: CombatHUD Full Rewrite — HP Bar, Lives, Wave Info, Kills, Gold

**Files:**
- Modify: `Assets/Scripts/CombatHUD.cs`

Rewrite the entire file to match JS draw.js positions at BASE_W=1920, BASE_H=1080. This task covers the top-of-screen elements. Task 3 covers gun/melee/hotbar. Task 4 covers death overlay.

- [ ] **Step 1: Replace CombatHUD.cs with new header and scaling**

Replace the entire file contents:

```csharp
// CombatHUD — Phase 2
// Placeholder HUD matching JS draw.js layout at BASE_W=1920, BASE_H=1080.
// Source of truth: docs/gdd/ui-hud-saveload.md, js/core/draw.js HUD section
// All positions/colors match JS. Replaced in Phase 6 with Canvas UI.
using UnityEngine;

public class CombatHUD : MonoBehaviour
{
    CombatState cs;
    Texture2D whiteTex;

    // JS reference resolution — js/core/draw.js, index.html:22
    const float BASE_W = 1920f;
    const float BASE_H = 1080f;

    void Start()
    {
        cs = CombatState.Instance;
        whiteTex = new Texture2D(1, 1);
        whiteTex.SetPixel(0, 0, Color.white);
        whiteTex.Apply();
    }

    // Scale factor: maps JS 1080-height coords to actual screen
    float S => Screen.height / BASE_H;
    // Horizontal offset to center 1920-width content on screen
    float XOff => (Screen.width - BASE_W * S) / 2f;

    // Convert JS coords to screen coords
    float SX(float jsX) => XOff + jsX * S;
    float SY(float jsY) => jsY * S;
    float SW(float jsW) => jsW * S;
    float SH(float jsH) => jsH * S;

    void OnGUI()
    {
        if (cs == null) cs = CombatState.Instance;
        if (cs == null) return;

        DrawPlayerHPBar();
        DrawLives();
        DrawWaveHUD();
        DrawKillsCounter();
        DrawGoldDisplay();
        DrawGunHUD();
        DrawMeleeHUD();
        DrawHotbar();
        DrawMobHPBars();
        DrawDeathOverlay();

        GUI.color = Color.white;
    }

    // === Helpers ===

    void DrawRect(float x, float y, float w, float h, Color c)
    {
        GUI.color = c;
        GUI.DrawTexture(new Rect(x, y, w, h), whiteTex);
    }

    void DrawRectJS(float jsX, float jsY, float jsW, float jsH, Color c)
    {
        DrawRect(SX(jsX), SY(jsY), SW(jsW), SH(jsH), c);
    }

    GUIStyle MakeStyle(int fontSize, Color color, TextAnchor align = TextAnchor.MiddleCenter,
        FontStyle fontStyle = FontStyle.Bold)
    {
        var style = new GUIStyle(GUI.skin.label)
        {
            fontSize = Mathf.RoundToInt(fontSize * S),
            fontStyle = fontStyle,
            alignment = align
        };
        style.normal.textColor = color;
        return style;
    }

    void LabelJS(float jsX, float jsY, float jsW, float jsH, string text, GUIStyle style)
    {
        GUI.Label(new Rect(SX(jsX), SY(jsY), SW(jsW), SH(jsH)), text, style);
    }

    // =======================================================================
    // 1. PLAYER HP BAR — top center
    // js/core/draw.js HP bar section
    // Panel at (774, 10) size 372×36, bar at (780, 16) size 360×24
    // =======================================================================

    void DrawPlayerHPBar()
    {
        // Background panel — rgba(0,0,0,0.6)
        DrawRectJS(774, 10, 372, 36, new Color(0, 0, 0, 0.6f));

        // HP fill
        float hpPct = cs.maxHp > 0 ? (float)cs.hp / cs.maxHp : 0;
        Color fillColor;
        if (hpPct > 0.5f)
            fillColor = new Color(0.29f, 0.67f, 0.29f); // #4a4 green
        else if (hpPct > 0.25f)
            fillColor = new Color(0.93f, 0.53f, 0f); // #e80 orange
        else
        {
            // Critical flash every 300ms — js/core/draw.js
            bool flash = ((int)(Time.time / 0.3f)) % 2 == 0;
            fillColor = flash ? new Color(1f, 0.4f, 0.4f) : new Color(1f, 0.27f, 0.27f); // #f66 / #f44
        }
        DrawRectJS(780, 16, 360 * hpPct, 24, fillColor);

        // Border — rgba(255,255,255,0.25) 2px
        DrawRectJS(780, 16, 360, 2, new Color(1, 1, 1, 0.25f));      // top
        DrawRectJS(780, 38, 360, 2, new Color(1, 1, 1, 0.25f));      // bottom
        DrawRectJS(780, 16, 2, 24, new Color(1, 1, 1, 0.25f));       // left
        DrawRectJS(1138, 16, 2, 24, new Color(1, 1, 1, 0.25f));      // right

        // Text: "100 / 100" — bold 18px monospace, white, centered
        var style = MakeStyle(18, Color.white);
        LabelJS(780, 16, 360, 24, $"{cs.hp} / {cs.maxHp}", style);
    }

    // =======================================================================
    // 2. LIVES — left of HP bar, dungeon only
    // js/core/draw.js: X = hpBarX - 110 + i*32, Y = hpBarY + 22
    // hpBarX = 780, hpBarY = 16
    // =======================================================================

    void DrawLives()
    {
        var ws = WaveSystem.Instance;
        if (ws == null || !ws.isActive) return;

        // ♥ hearts: filled = #e33, empty = #333
        var filledStyle = MakeStyle(24, new Color(0.93f, 0.2f, 0.2f)); // #e33
        var emptyStyle = MakeStyle(24, new Color(0.2f, 0.2f, 0.2f));   // #333

        float baseX = 780 - 110; // hpBarX - 110 = 670
        float baseY = 16 + 6;    // approximately hpBarY + offset to center with bar

        for (int i = 0; i < 3; i++)
        {
            bool filled = i < cs.lives;
            var style = filled ? filledStyle : emptyStyle;
            LabelJS(baseX + i * 32, baseY, 32, 30, "\u2665", style); // ♥
        }
    }

    // =======================================================================
    // 3. WAVE HUD — top center below HP bar, dungeon only
    // js/core/draw.js wave HUD section
    // Floor at Y:56, wave state at Y:86
    // =======================================================================

    void DrawWaveHUD()
    {
        var ws = WaveSystem.Instance;
        if (ws == null || !ws.isActive) return;

        // Floor indicator — "FLOOR 3 / 5", bold 14px, #b090e0, center
        var floorStyle = MakeStyle(14, new Color(0.69f, 0.56f, 0.88f)); // #b090e0
        LabelJS(0, 56, BASE_W, 20, $"FLOOR {ws.dungeonFloor} / 5", floorStyle);

        // Wave state — bold 30px, center, Y:86
        string mainText = "";
        Color mainColor = Color.white;
        string subtitle = "";
        Color subColor = new Color(0.67f, 0.67f, 0.67f); // #aaa

        if (ws.dungeonComplete && ws.stairsOpen)
        {
            mainText = "DUNGEON COMPLETE!";
            mainColor = new Color(1f, 0.84f, 0f); // #ffd700
            int totalWaves = ws.GetTotalWaves();
            subtitle = $"All {totalWaves} waves cleared! Find the exit!";
            subColor = new Color(1f, 0.84f, 0f);
        }
        else if (ws.stairsOpen)
        {
            mainText = "FLOOR CLEAR!";
            mainColor = new Color(0.69f, 0.5f, 1f); // #b080ff
            subtitle = "Find the staircase";
        }
        else if (ws.waveState == "between_waves")
        {
            if (ws.wave > 0)
            {
                // "NEXT WAVE IN [sec]"
                float sec = ws.GetBetweenWaveTimer();
                mainText = $"NEXT WAVE IN {Mathf.CeilToInt(sec)}";
                mainColor = new Color(1f, 0.67f, 0f); // #fa0
                int gw = ws.GetGlobalWave();
                int tw = ws.GetTotalWaves();
                subtitle = $"[G] Skip  \u2022  Wave {gw}/{tw}";
            }
            else
            {
                // "GET READY..."
                float sec = ws.GetBetweenWaveTimer();
                mainText = $"GET READY... {Mathf.CeilToInt(sec)}";
                mainColor = new Color(0.53f, 0.53f, 0.53f); // #888
                subtitle = "[G] Skip";
            }
        }
        else if (ws.waveState == "active")
        {
            int gw = ws.GetGlobalWave();
            int tw = ws.GetTotalWaves();
            bool isBoss = ws.IsBossWave();
            mainText = $"WAVE {gw}/{tw}";
            mainColor = isBoss ? new Color(1f, 0.27f, 0.27f) : Color.white; // boss: #ff4444

            string theme = ws.waveTheme;
            int alive = ws.GetAliveCount();
            subtitle = $"{theme}  \u2022  {alive} remaining";
            subColor = isBoss ? new Color(1f, 0.4f, 0.4f) : new Color(1f, 0.67f, 0f); // boss: #ff6666, normal theme: #fa0
        }
        else if (ws.waveState == "dungeon_complete")
        {
            mainText = "DUNGEON COMPLETE!";
            mainColor = new Color(1f, 0.84f, 0f); // #ffd700
            subtitle = "Returning to lobby...";
            subColor = new Color(0.67f, 0.67f, 0.67f);
        }

        if (!string.IsNullOrEmpty(mainText))
        {
            var mainStyle = MakeStyle(30, mainColor);
            LabelJS(0, 86, BASE_W, 40, mainText, mainStyle);
        }

        if (!string.IsNullOrEmpty(subtitle))
        {
            var subStyle = MakeStyle(13, subColor);
            LabelJS(0, 130, BASE_W, 20, subtitle, subStyle);
        }
    }

    // =======================================================================
    // 4. KILLS COUNTER — top right
    // js/core/draw.js: X = BASE_W - 24, right-aligned
    // "KILLS" bold 18px #888 Y:30, value bold 32px #fff Y:62
    // =======================================================================

    void DrawKillsCounter()
    {
        var ws = WaveSystem.Instance;
        if (ws == null || !ws.isActive) return;

        float rightEdge = BASE_W - 24;
        float labelW = 120;

        var labelStyle = MakeStyle(18, new Color(0.53f, 0.53f, 0.53f), TextAnchor.MiddleRight); // #888
        LabelJS(rightEdge - labelW, 20, labelW, 24, "KILLS", labelStyle);

        var valueStyle = MakeStyle(32, Color.white, TextAnchor.MiddleRight);
        LabelJS(rightEdge - labelW, 50, labelW, 40, cs.kills.ToString(), valueStyle);
    }

    // =======================================================================
    // 5. GOLD DISPLAY — center area, dungeon only
    // js/core/draw.js: coin at (BASE_W/2 - 50, 140), amount at (BASE_W/2 + 10, 147)
    // =======================================================================

    void DrawGoldDisplay()
    {
        var ws = WaveSystem.Instance;
        if (ws == null || !ws.isActive) return;

        Color goldColor = new Color(1f, 0.76f, 0.03f); // #ffc107

        // Coin circle placeholder — draw a small gold square (OnGUI can't draw circles easily)
        DrawRectJS(BASE_W / 2 - 54, 134, 24, 24, goldColor);

        // "G" on coin
        var coinStyle = MakeStyle(12, new Color(0.14f, 0.12f, 0f), TextAnchor.MiddleCenter);
        LabelJS(BASE_W / 2 - 54, 134, 24, 24, "G", coinStyle);

        // Gold amount — "[gold]g", bold 20px, #ffc107
        var amountStyle = MakeStyle(20, goldColor, TextAnchor.MiddleLeft);
        LabelJS(BASE_W / 2 - 22, 135, 200, 28, $"{cs.gold}g", amountStyle);
    }

    // =======================================================================
    // 6. GUN HUD — right side, when activeSlot == 0
    // js/core/draw.js: X = BASE_W - 230 = 1690, Y = BASE_H/2 - 110 = 430
    // Size: 130×220
    // =======================================================================

    void DrawGunHUD()
    {
        if (GunSystem.activeSlot != 0) return;

        float hx = BASE_W - 230; // 1690
        float hy = BASE_H / 2 - 110; // 430

        // Background — rgba(0,0,0,0.6)
        DrawRectJS(hx, hy, 130, 220, new Color(0, 0, 0, 0.6f));
        // Border — rgba(255,255,255,0.15) 1px
        DrawRectJS(hx, hy, 130, 1, new Color(1, 1, 1, 0.15f));       // top
        DrawRectJS(hx, hy + 219, 130, 1, new Color(1, 1, 1, 0.15f)); // bottom
        DrawRectJS(hx, hy, 1, 220, new Color(1, 1, 1, 0.15f));       // left
        DrawRectJS(hx + 129, hy, 1, 220, new Color(1, 1, 1, 0.15f)); // right

        // Gun name — "Recruit Gun", bold 13px, #fa0
        var nameStyle = MakeStyle(13, new Color(1f, 0.67f, 0f), TextAnchor.MiddleCenter); // #fa0
        LabelJS(hx, hy + 8, 130, 20, "Recruit Gun", nameStyle);

        // Ammo — "[ammo]/[mag]", bold 18px, center
        string ammoText;
        Color ammoColor;
        if (cs.gunReloading)
        {
            ammoText = "R..";
            ammoColor = new Color(1f, 0.67f, 0f); // #fa0
        }
        else if (cs.gunAmmo < 5)
        {
            ammoText = $"{cs.gunAmmo}/{cs.gunMagSize}";
            ammoColor = new Color(1f, 0.27f, 0.27f); // #f44
        }
        else
        {
            ammoText = $"{cs.gunAmmo}/{cs.gunMagSize}";
            ammoColor = Color.white;
        }
        var ammoStyle = MakeStyle(18, ammoColor);
        LabelJS(hx, hy + 68, 130, 24, ammoText, ammoStyle);

        // Reload progress bar (if reloading) — Y: hy+84, 4px, #fa0
        if (cs.gunReloading && cs.gunReloadTimeSec > 0)
        {
            float progress = 1f - (cs.gunReloadTimer / cs.gunReloadTimeSec);
            progress = Mathf.Clamp01(progress);
            DrawRectJS(hx + 10, hy + 84, 110, 4, new Color(1f, 0.67f, 0f, 0.3f)); // track
            DrawRectJS(hx + 10, hy + 84, 110 * progress, 4, new Color(1f, 0.67f, 0f)); // fill
        }

        // Stats: DMG / MAG / RATE — bold 10px, Y starting at hy+96
        float statY = hy + 96;
        DrawStatBar(hx, statY, "DMG", cs.gunDamage, 60, new Color(1f, 0.4f, 0.4f)); // #f66
        DrawStatBar(hx, statY + 18, "MAG", cs.gunMagSize, 100, new Color(0.27f, 0.8f, 1f)); // #4cf
        float fireRateDisplay = 60f / (cs.gunFireRateSec * 60f); // shots per second approx
        DrawStatBar(hx, statY + 36, "RATE", fireRateDisplay, 4f, new Color(1f, 0.67f, 0f)); // #fa0

        // Footer — "[R] Reload", bold 9px, rgba(255,255,255,0.35)
        var footerStyle = MakeStyle(9, new Color(1, 1, 1, 0.35f));
        LabelJS(hx, hy + 205, 130, 14, "[R] Reload", footerStyle);
    }

    void DrawStatBar(float jsX, float jsY, string label, float value, float maxVal, Color barColor)
    {
        // Label
        var labelStyle = MakeStyle(10, barColor, TextAnchor.MiddleLeft);
        LabelJS(jsX + 6, jsY, 32, 14, label, labelStyle);

        // Value text
        string valText = value == (int)value ? ((int)value).ToString() : value.ToString("F1");
        var valStyle = MakeStyle(10, Color.white, TextAnchor.MiddleRight);
        LabelJS(jsX + 70, jsY, 54, 14, valText, valStyle);

        // Bar background
        DrawRectJS(jsX + 38, jsY + 5, 55, 4, new Color(0.2f, 0.2f, 0.2f, 0.5f));

        // Bar fill
        float pct = Mathf.Clamp01(value / maxVal);
        DrawRectJS(jsX + 38, jsY + 5, 55 * pct, 4, barColor);
    }

    // =======================================================================
    // 7. MELEE HUD — right side, when activeSlot == 1
    // js/core/draw.js: same position as gun HUD, 130×180
    // =======================================================================

    void DrawMeleeHUD()
    {
        if (GunSystem.activeSlot != 1) return;

        float hx = BASE_W - 230;
        float hy = BASE_H / 2 - 110;

        // Background
        DrawRectJS(hx, hy, 130, 180, new Color(0, 0, 0, 0.6f));
        // Border
        DrawRectJS(hx, hy, 130, 1, new Color(1, 1, 1, 0.15f));
        DrawRectJS(hx, hy + 179, 130, 1, new Color(1, 1, 1, 0.15f));
        DrawRectJS(hx, hy, 1, 180, new Color(1, 1, 1, 0.15f));
        DrawRectJS(hx + 129, hy, 1, 180, new Color(1, 1, 1, 0.15f));

        // Melee name — "Katana", bold 12px, #aaa
        var nameStyle = MakeStyle(12, new Color(0.67f, 0.67f, 0.67f));
        LabelJS(hx, hy + 8, 130, 20, "Katana", nameStyle);

        // Stats: DMG / RNG / SPD / CRIT — starting Y: hy+42
        float statY = hy + 42;
        DrawStatBar(hx, statY, "DMG", cs.meleeDamage, 150, new Color(1f, 0.4f, 0.4f)); // #f66
        DrawStatBar(hx, statY + 18, "RNG", cs.meleeRange, 160, new Color(0.27f, 0.8f, 1f)); // #4cf

        float swingsPerSec = 1f / cs.meleeCooldownMaxSec;
        DrawStatBar(hx, statY + 36, "SPD", swingsPerSec, 4f, new Color(0.27f, 1f, 0.27f)); // #4f4

        float critPct = cs.meleeCritChance * 100f;
        DrawStatBar(hx, statY + 54, "CRIT", critPct, 50f, new Color(0.78f, 0.53f, 1f)); // #c8f

        // Footer — "[Click] Swing", 9px, rgba(255,255,255,0.3)
        var footerStyle = MakeStyle(9, new Color(1, 1, 1, 0.3f));
        LabelJS(hx, hy + 162, 130, 14, "[Click] Swing", footerStyle);
    }

    // =======================================================================
    // 8. HOTBAR — 5 slots, right side vertical
    // js/core/draw.js: X = BASE_W - 68 = 1852, Y = BASE_H/2 - 175 = 365
    // Slot: 64×64, gap 6, vertical
    // =======================================================================

    static readonly string[] SLOT_LABELS = { "GUN", "MEL", "POT", "\u2014", "\u2014" }; // — for locked
    static readonly Color[] SLOT_COLORS = {
        new Color(1f, 0.67f, 0f),       // gun: #fa0
        new Color(0.67f, 0.67f, 0.67f), // melee: #aaa
        new Color(0.33f, 0.33f, 0.33f), // potion: #555
        new Color(0.27f, 0.27f, 0.27f), // item: #444
        new Color(0.27f, 0.27f, 0.27f), // grab: #444
    };

    void DrawHotbar()
    {
        float slotX = BASE_W - 68;     // 1852
        float startY = BASE_H / 2 - 175; // 365
        float slotSize = 64;
        float gap = 6;

        for (int i = 0; i < 5; i++)
        {
            float sy = startY + i * (slotSize + gap);
            bool isActive = (i == GunSystem.activeSlot);
            bool isLocked = i >= 2; // slots 3-5 locked in Phase 2

            // Background
            Color bgColor, borderColor;
            if (isActive)
            {
                bgColor = new Color(80 / 255f, 200 / 255f, 120 / 255f, 0.25f); // rgba(80,200,120,0.25)
                borderColor = new Color(0.29f, 0.6f, 1f); // #4a9eff
            }
            else if (isLocked)
            {
                bgColor = new Color(20 / 255f, 20 / 255f, 30 / 255f, 0.6f); // rgba(20,20,30,0.6)
                borderColor = new Color(80 / 255f, 80 / 255f, 120 / 255f, 0.3f); // rgba(80,80,120,0.3)
            }
            else
            {
                bgColor = new Color(0, 0, 0, 0.6f);
                borderColor = new Color(1, 1, 1, 0.15f);
            }

            // Draw slot background
            DrawRectJS(slotX - slotSize / 2, sy, slotSize, slotSize, bgColor);

            // Draw border (2.5px for active, 1px otherwise)
            float bw = isActive ? 2.5f : 1f;
            DrawRectJS(slotX - slotSize / 2, sy, slotSize, bw, borderColor);                      // top
            DrawRectJS(slotX - slotSize / 2, sy + slotSize - bw, slotSize, bw, borderColor);      // bottom
            DrawRectJS(slotX - slotSize / 2, sy, bw, slotSize, borderColor);                      // left
            DrawRectJS(slotX - slotSize / 2 + slotSize - bw, sy, bw, slotSize, borderColor);      // right

            // Key number — top-left, bold 12px
            Color keyColor = isActive ? new Color(0.29f, 0.6f, 1f) : new Color(0.4f, 0.4f, 0.4f); // #4a9eff / #666
            var keyStyle = MakeStyle(12, keyColor, TextAnchor.UpperLeft);
            LabelJS(slotX - slotSize / 2 + 4, sy + 2, 20, 16, (i + 1).ToString(), keyStyle);

            // Slot label — center
            var labelStyle = MakeStyle(14, SLOT_COLORS[i]);
            LabelJS(slotX - slotSize / 2, sy, slotSize, slotSize, SLOT_LABELS[i], labelStyle);

            // Ammo badge (gun slot, active)
            if (i == 0 && isActive)
            {
                string badge = cs.gunReloading ? "R.." : $"{cs.gunAmmo}/{cs.gunMagSize}";
                var badgeStyle = MakeStyle(11, Color.white, TextAnchor.LowerCenter);
                LabelJS(slotX - slotSize / 2, sy + slotSize - 18, slotSize, 16, badge, badgeStyle);
            }
        }
    }

    // =======================================================================
    // 9. MOB HP BARS — world-space above mobs
    // Kept from Phase 1b, adapted to new coordinate helpers
    // =======================================================================

    void DrawMobHPBars()
    {
        var mobMgr = MobManager.Instance;
        if (mobMgr == null) return;
        var cam = Camera.main;
        if (cam == null) return;

        foreach (var mob in mobMgr.activeMobs)
        {
            if (mob == null || mob.isDead) continue;
            if (mob.hp >= mob.maxHp) continue;

            Vector3 screenPos = cam.WorldToScreenPoint(mob.transform.position);
            if (screenPos.z < 0) continue;

            float barW = SW(40);
            float barH = SW(5);
            float mbX = screenPos.x - barW / 2f;
            float mbY = Screen.height - screenPos.y - SW(30);

            // Background
            DrawRect(mbX, mbY, barW, barH, new Color(0.1f, 0.1f, 0.1f, 0.8f));

            // HP fill
            float mhpPct = (float)mob.hp / mob.maxHp;
            DrawRect(mbX, mbY, barW * mhpPct, barH, Color.Lerp(Color.red, Color.green, mhpPct));
        }
    }

    // =======================================================================
    // 10. DEATH OVERLAY — 3 phases matching JS
    // js/core/draw.js death overlay section
    // Phase 1: YOU DIED (shaking), Phase 2: countdown, Phase 3: game over
    // =======================================================================

    void DrawDeathOverlay()
    {
        if (!cs.isDead) return;

        // Full screen dark overlay — rgba(0,0,0,0.5)
        DrawRect(0, 0, Screen.width, Screen.height, new Color(0, 0, 0, 0.5f));

        float deathAnimEnd = CombatState.RESPAWN_TIME_SEC - CombatState.DEATH_ANIM_SEC;

        if (cs.respawnTimer > deathAnimEnd && cs.lives > 0)
        {
            // Phase 1: "YOU DIED" with shake
            float shakeX = Mathf.Sin(Time.time * 30f) * 3f * S;

            // Shadow
            var shadowStyle = MakeStyle(36, new Color(0.8f, 0.13f, 0.13f)); // #cc2222
            GUI.Label(new Rect(Screen.width / 2f - SW(200) + shakeX + S * 2,
                SY(BASE_H / 2 - 20) + S * 2, SW(400), SH(50)), "YOU DIED", shadowStyle);

            // Main
            var mainStyle = MakeStyle(34, new Color(1f, 0.27f, 0.27f)); // #ff4444
            GUI.Label(new Rect(Screen.width / 2f - SW(200) + shakeX,
                SY(BASE_H / 2 - 20), SW(400), SH(50)), "YOU DIED", mainStyle);
        }
        else if (cs.respawnTimer > 0 && cs.lives > 0)
        {
            // Phase 2: Respawn countdown
            // "Respawning in" — bold 16px, #aaa
            var labelStyle = MakeStyle(16, new Color(0.67f, 0.67f, 0.67f));
            LabelJS(0, BASE_H / 2 - 40, BASE_W, 24, "Respawning in", labelStyle);

            // Countdown digit — bold 64px, white, pulsing scale
            int countSec = Mathf.CeilToInt(cs.respawnTimer);
            float pulse = 1f + Mathf.Sin(Time.time * 4.2f) * 0.08f; // sin(time/150) at 60fps ≈ *0.4
            var digitStyle = MakeStyle(Mathf.RoundToInt(64 * pulse), Color.white);
            LabelJS(0, BASE_H / 2 - 10, BASE_W, 80, countSec.ToString(), digitStyle);

            // Lives — "♥ LAST LIFE" or "♥♥♥ 3 lives left"
            string livesText;
            if (cs.lives == 1)
                livesText = "\u2665 LAST LIFE";
            else
            {
                string hearts = new string('\u2665', cs.lives);
                livesText = $"{hearts} {cs.lives} lives left";
            }
            var livesStyle = MakeStyle(14, new Color(0.93f, 0.27f, 0.27f)); // #e44
            LabelJS(0, BASE_H / 2 + 70, BASE_W, 20, livesText, livesStyle);
        }
        else if (cs.lives <= 0)
        {
            // Phase 3: Game Over
            var goStyle = MakeStyle(28, new Color(0.8f, 0.13f, 0.13f)); // #cc2222
            LabelJS(0, BASE_H / 2 - 40, BASE_W, 40, "GAME OVER", goStyle);

            var subStyle = MakeStyle(16, new Color(0.67f, 0.67f, 0.67f));
            LabelJS(0, BASE_H / 2 + 10, BASE_W, 24, "Returning to lobby...", subStyle);
        }
    }
}
```

- [ ] **Step 2: Verify compilation**

Use Unity MCP `read_console` to check for errors.

- [ ] **Step 3: Enter Play mode and verify HUD elements**

Enter Play mode, walk into cave dungeon. Verify:
- HP bar centered at top, correct colors at different HP levels
- Lives hearts show left of HP bar
- Wave info shows floor/wave/state with correct text per state
- Kills counter top-right, gold display center
- Gun HUD panel shows on right when slot 1 active
- Melee HUD shows when slot 2 active
- Hotbar 5 slots on right side, active slot highlighted, 3-5 grayed
- Mob HP bars above damaged mobs
- Death overlay: shaking YOU DIED → countdown → lives text

- [ ] **Step 4: Commit**

```bash
git add Assets/Scripts/CombatHUD.cs
git commit -m "Phase 2 task 2: CombatHUD full rewrite matching JS draw.js layout"
```

---

### Task 3: ChatSystem — Canvas UI + Debug Commands

**Files:**
- Create: `Assets/Scripts/ChatSystem.cs`

Canvas-based chat with InputField, message log, and 5 debug commands.

- [ ] **Step 1: Create ChatSystem.cs**

```csharp
// ChatSystem — Phase 2
// Canvas-based chat input + message display + debug commands.
// Source of truth: js/client/ui/panelManager.js:48, :509-891, :902-972
// Toggle: Tab key (js/client/ui/settings.js:16 default chat keybind)
using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;

public class ChatSystem : MonoBehaviour
{
    public static ChatSystem Instance { get; private set; }
    public bool IsOpen { get; private set; }

    // JS constants
    const int MAX_MESSAGES = 50;      // js/client/ui/panelManager.js:902
    const int MAX_INPUT_LENGTH = 80;  // js/client/ui/panelManager.js:912

    // UI references
    Canvas canvas;
    GameObject panelGO;
    InputField inputField;
    Text messageText;
    readonly List<ChatMessage> messages = new List<ChatMessage>();

    struct ChatMessage
    {
        public string text;
        public Color color;
    }

    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        BuildUI();
        panelGO.SetActive(false);
    }

    void BuildUI()
    {
        // Canvas
        var canvasGO = new GameObject("ChatCanvas");
        canvasGO.transform.SetParent(transform);
        canvas = canvasGO.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 100;
        canvasGO.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        canvasGO.GetComponent<CanvasScaler>().referenceResolution = new Vector2(1920, 1080);
        canvasGO.AddComponent<GraphicRaycaster>();

        // Panel background — bottom-left, 400×300
        panelGO = new GameObject("ChatPanel");
        panelGO.transform.SetParent(canvasGO.transform, false);
        var panelRT = panelGO.AddComponent<RectTransform>();
        panelRT.anchorMin = new Vector2(0, 0);
        panelRT.anchorMax = new Vector2(0, 0);
        panelRT.pivot = new Vector2(0, 0);
        panelRT.anchoredPosition = new Vector2(10, 10);
        panelRT.sizeDelta = new Vector2(400, 300);
        var panelImg = panelGO.AddComponent<Image>();
        panelImg.color = new Color(8 / 255f, 8 / 255f, 14 / 255f, 0.85f); // rgba(8,8,14,0.85)

        // Message scroll area — fills panel above input
        var msgGO = new GameObject("Messages");
        msgGO.transform.SetParent(panelGO.transform, false);
        var msgRT = msgGO.AddComponent<RectTransform>();
        msgRT.anchorMin = new Vector2(0, 0);
        msgRT.anchorMax = new Vector2(1, 1);
        msgRT.offsetMin = new Vector2(8, 36); // above input
        msgRT.offsetMax = new Vector2(-8, -8);
        messageText = msgGO.AddComponent<Text>();
        messageText.font = Font.CreateDynamicFontFromOSFont("Consolas", 13);
        if (messageText.font == null) messageText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        messageText.fontSize = 13;
        messageText.color = Color.white;
        messageText.alignment = TextAnchor.LowerLeft;
        messageText.verticalOverflow = VerticalWrapMode.Truncate;
        messageText.horizontalOverflow = HorizontalWrapMode.Wrap;

        // Input field — bottom of panel
        var inputGO = new GameObject("ChatInput");
        inputGO.transform.SetParent(panelGO.transform, false);
        var inputRT = inputGO.AddComponent<RectTransform>();
        inputRT.anchorMin = new Vector2(0, 0);
        inputRT.anchorMax = new Vector2(1, 0);
        inputRT.pivot = new Vector2(0.5f, 0);
        inputRT.anchoredPosition = new Vector2(0, 4);
        inputRT.sizeDelta = new Vector2(-16, 28);
        var inputBg = inputGO.AddComponent<Image>();
        inputBg.color = new Color(20 / 255f, 20 / 255f, 30 / 255f, 0.9f);

        // Input text child
        var textGO = new GameObject("Text");
        textGO.transform.SetParent(inputGO.transform, false);
        var textRT = textGO.AddComponent<RectTransform>();
        textRT.anchorMin = Vector2.zero;
        textRT.anchorMax = Vector2.one;
        textRT.offsetMin = new Vector2(6, 2);
        textRT.offsetMax = new Vector2(-6, -2);
        var inputText = textGO.AddComponent<Text>();
        inputText.font = messageText.font;
        inputText.fontSize = 13;
        inputText.color = Color.white;
        inputText.alignment = TextAnchor.MiddleLeft;
        inputText.supportRichText = false;

        // Placeholder text child
        var placeholderGO = new GameObject("Placeholder");
        placeholderGO.transform.SetParent(inputGO.transform, false);
        var phRT = placeholderGO.AddComponent<RectTransform>();
        phRT.anchorMin = Vector2.zero;
        phRT.anchorMax = Vector2.one;
        phRT.offsetMin = new Vector2(6, 2);
        phRT.offsetMax = new Vector2(-6, -2);
        var phText = placeholderGO.AddComponent<Text>();
        phText.font = messageText.font;
        phText.fontSize = 13;
        phText.color = new Color(1, 1, 1, 0.3f);
        phText.alignment = TextAnchor.MiddleLeft;
        phText.text = "Type a message...";
        phText.fontStyle = FontStyle.Italic;

        // Wire InputField
        inputField = inputGO.AddComponent<InputField>();
        inputField.textComponent = inputText;
        inputField.placeholder = phText;
        inputField.characterLimit = MAX_INPUT_LENGTH;
        inputField.onEndEdit.AddListener(OnSubmit);
    }

    void Update()
    {
        // Tab toggles chat — js/client/ui/settings.js:16
        if (Input.GetKeyDown(KeyCode.Tab))
        {
            if (IsOpen)
                CloseChat();
            else
                OpenChat();
        }

        // Escape closes chat
        if (IsOpen && Input.GetKeyDown(KeyCode.Escape))
            CloseChat();
    }

    void OpenChat()
    {
        IsOpen = true;
        panelGO.SetActive(true);
        inputField.text = "";
        inputField.ActivateInputField();
        inputField.Select();
    }

    void CloseChat()
    {
        IsOpen = false;
        panelGO.SetActive(false);
        // Deselect to release focus
        UnityEngine.EventSystems.EventSystem.current?.SetSelectedGameObject(null);
    }

    void OnSubmit(string text)
    {
        if (!IsOpen) return;

        // Enter submits, then keep chat open
        if (Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter))
        {
            string trimmed = text.Trim();
            if (!string.IsNullOrEmpty(trimmed))
            {
                if (trimmed.StartsWith("/"))
                    ProcessCommand(trimmed);
                else
                    AddMessage($"[You]: {trimmed}", Color.white);
            }
            inputField.text = "";
            inputField.ActivateInputField();
        }
    }

    // === Debug Commands === js/client/ui/panelManager.js:509-891

    void ProcessCommand(string cmd)
    {
        string lower = cmd.ToLower();
        var cs = CombatState.Instance;
        var ws = WaveSystem.Instance;

        // /heal — js/client/ui/panelManager.js:529
        if (lower == "/heal")
        {
            if (cs != null)
            {
                cs.hp = cs.maxHp;
                AddMessage("Healed to full HP", new Color(1f, 0.84f, 0f)); // gold
            }
            return;
        }

        // /gold [n] — js/client/ui/panelManager.js:509
        if (lower.StartsWith("/gold") || lower.StartsWith("/addgold"))
        {
            int amount = 500; // default
            string[] parts = cmd.Split(' ');
            if (parts.Length > 1 && int.TryParse(parts[1], out int parsed))
                amount = parsed;
            if (cs != null)
            {
                cs.gold += amount;
                AddMessage($"Added {amount} gold (total: {cs.gold})", new Color(1f, 0.84f, 0f));
            }
            return;
        }

        // /gun <id> [tier] [level] — js/client/ui/panelManager.js:799
        if (lower.StartsWith("/gun"))
        {
            // Equipment not implemented yet — log only
            AddMessage("Gun command noted (equipment not yet implemented)", new Color(1f, 0.67f, 0f));
            return;
        }

        // /wave [n] — js/client/ui/panelManager.js:514
        if (lower.StartsWith("/wave"))
        {
            string[] parts = cmd.Split(' ');
            if (parts.Length > 1 && int.TryParse(parts[1], out int targetWave))
            {
                if (ws != null && ws.isActive)
                {
                    ws.DebugSkipToWave(targetWave);
                    AddMessage($"Skipping to wave {targetWave}", new Color(1f, 0.84f, 0f));
                }
                else
                    AddMessage("Not in a dungeon", new Color(1f, 0.27f, 0.27f));
            }
            else
                AddMessage("Usage: /wave <number>", new Color(0.67f, 0.67f, 0.67f));
            return;
        }

        // /floor [n] — js/client/ui/panelManager.js:599
        if (lower.StartsWith("/floor"))
        {
            string[] parts = cmd.Split(' ');
            if (parts.Length > 1 && int.TryParse(parts[1], out int targetFloor))
            {
                if (ws != null && ws.isActive)
                {
                    ws.DebugSkipToFloor(targetFloor);
                    AddMessage($"Skipping to floor {targetFloor}", new Color(1f, 0.84f, 0f));
                }
                else
                    AddMessage("Not in a dungeon", new Color(1f, 0.27f, 0.27f));
            }
            else
                AddMessage("Usage: /floor <number>", new Color(0.67f, 0.67f, 0.67f));
            return;
        }

        AddMessage($"Unknown command: {cmd}", new Color(1f, 0.27f, 0.27f));
    }

    // === Message management ===

    public void AddMessage(string text, Color color)
    {
        messages.Add(new ChatMessage { text = text, color = color });
        // Ring buffer — js/client/ui/panelManager.js:902
        while (messages.Count > MAX_MESSAGES)
            messages.RemoveAt(0);
        RefreshDisplay();
    }

    void RefreshDisplay()
    {
        if (messageText == null) return;
        var sb = new System.Text.StringBuilder();
        foreach (var msg in messages)
        {
            string hex = ColorUtility.ToHtmlStringRGB(msg.color);
            sb.AppendLine($"<color=#{hex}>{msg.text}</color>");
        }
        messageText.text = sb.ToString();
    }
}
```

- [ ] **Step 2: Verify compilation**

Use Unity MCP `read_console` to check for errors.

- [ ] **Step 3: Commit**

```bash
git add Assets/Scripts/ChatSystem.cs
git commit -m "Phase 2 task 3: ChatSystem with Canvas UI and 5 debug commands"
```

---

### Task 4: Wire ChatSystem + Block Movement When Chat Open

**Files:**
- Modify: `Assets/Scripts/GameBootstrap.cs`
- Modify: `Assets/Scripts/PlayerController.cs`
- Modify: `Assets/Scripts/GunSystem.cs`

- [ ] **Step 1: Add ChatSystem to GameBootstrap**

In `GameBootstrap.cs`, in the `EnsureCombatManagers()` method, after the line `go.AddComponent<CombatHUD>();` (line 34), add:

```csharp
            if (ChatSystem.Instance == null) go.AddComponent<ChatSystem>();
```

Also need to ensure an EventSystem exists for the InputField to work. Add at the end of `EnsureCombatManagers()`:

```csharp
        // EventSystem required for Canvas InputField
        if (Object.FindAnyObjectByType<UnityEngine.EventSystems.EventSystem>() == null)
        {
            var esGO = new GameObject("EventSystem");
            esGO.AddComponent<UnityEngine.EventSystems.EventSystem>();
            esGO.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
        }
```

- [ ] **Step 2: Block movement when chat is open**

In `PlayerController.cs`, in `Update()`, after the dead check (line 29), add:

```csharp
        // Block movement when chat is open — js/client/ui/panelManager.js chat panel
        if (ChatSystem.Instance != null && ChatSystem.Instance.IsOpen) return;
```

- [ ] **Step 3: Block shooting/melee when chat is open**

In `GunSystem.cs`, in `Update()`, after the dead check (line 23), add:

```csharp
        // Block weapon input when chat is open
        if (ChatSystem.Instance != null && ChatSystem.Instance.IsOpen) return;
```

- [ ] **Step 4: Verify compilation**

Use Unity MCP `read_console` to check for errors.

- [ ] **Step 5: Enter Play mode and test chat**

1. Press Tab — chat panel appears bottom-left
2. Type "hello" + Enter — see "[You]: hello" in white
3. Type "/heal" + Enter — see "Healed to full HP" in gold
4. Type "/gold 1000" + Enter — see gold counter increase
5. WASD should NOT move player while chat is open
6. Press Tab or Escape — chat closes, movement resumes
7. Enter dungeon, type "/wave 5" — skips to wave 5
8. Type "/floor 3" — skips to floor 3

- [ ] **Step 6: Commit**

```bash
git add Assets/Scripts/GameBootstrap.cs Assets/Scripts/PlayerController.cs Assets/Scripts/GunSystem.cs
git commit -m "Phase 2 task 4: wire ChatSystem, block movement/combat when chat open"
```

---

### Task 5: Update GAME_UPDATE + Final Commit + Push

**Files:**
- Modify: `js/shared/gameConfig.js` (GAME_UPDATE increment)
- Modify: `C:\Users\jeff\.claude\projects\C--Users-jeff-Desktop-Teah-Online\memory\project_unity_port_progress.md`

- [ ] **Step 1: Read current GAME_UPDATE value**

Read `js/shared/gameConfig.js` and find the current `GAME_UPDATE` value.

- [ ] **Step 2: Increment GAME_UPDATE by 1**

Edit the value to current + 1.

- [ ] **Step 3: Update memory file**

Update `project_unity_port_progress.md` to reflect Phase 2 completion:
- Add ChatSystem.cs to script list (21 total)
- Update Phase 2 status to "CODE WRITTEN — needs Play mode testing"
- Note the new HUD elements

- [ ] **Step 4: Commit and push all changes**

```bash
git add -A
git commit -m "Phase 2: HUD matching JS layout + chat with debug commands

CombatHUD.cs rewritten to match JS draw.js positions at 1920x1080:
- HP bar (top center, 360x24, color thresholds)
- Lives hearts (left of HP bar, dungeon only)
- Wave HUD (6 states: GET READY, active, between waves, floor clear, dungeon complete)
- Kills counter (top right), gold display (center with coin)
- Gun HUD panel (right side, ammo, reload bar, stats)
- Melee HUD panel (right side, DMG/RNG/SPD/CRIT)
- Hotbar (5 slots vertical right, slots 3-5 locked)
- Death overlay (3 phases: shaking YOU DIED, countdown digit, game over)
- Mob HP bars (world-space above damaged mobs)

New ChatSystem.cs (Canvas-based):
- Tab toggle, 80-char input, 50-message ring buffer
- 5 debug commands: /heal, /gold, /gun, /wave, /floor
- Blocks movement+combat while open

WaveSystem.cs: public getters (alive count, global wave, boss check) + debug skip methods
PlayerController.cs + GunSystem.cs: block input when chat open
GameBootstrap.cs: wire ChatSystem + EventSystem"
git push
```

- [ ] **Step 5: Report update number to user**

Tell the user the GAME_UPDATE number.

---

## Self-Review Checklist

**Spec coverage:**
- HP bar (top center, thresholds): Task 2 ✓
- Lives display (hearts): Task 2 ✓
- Wave HUD (6 states): Task 2 ✓
- Kills counter: Task 2 ✓
- Gold display: Task 2 ✓
- Gun HUD panel: Task 2 ✓
- Melee HUD panel: Task 2 ✓
- Hotbar (5 slots): Task 2 ✓
- Death overlay (3 phases): Task 2 ✓
- Mob HP bars: Task 2 ✓
- Chat system: Task 3 ✓
- Debug commands (/heal, /gold, /gun, /wave, /floor): Task 3 ✓
- Block movement when chat open: Task 4 ✓
- WaveSystem getters: Task 1 ✓
- WaveSystem debug skip: Task 1 ✓
- Interactable prompts: Correctly excluded (deferred) ✓

**Placeholder scan:** No TBDs, TODOs, or vague steps. All code provided inline.

**Type consistency:**
- `WaveSystem.GetAliveCount()` used in Task 1 (defined) and Task 2 CombatHUD (consumed) ✓
- `WaveSystem.GetBetweenWaveTimer()` used in Task 1 and Task 2 ✓
- `WaveSystem.IsBossWave()` used in Task 1 and Task 2 ✓
- `WaveSystem.DebugSkipToWave(int)` used in Task 1 and Task 3 ✓
- `WaveSystem.DebugSkipToFloor(int)` used in Task 1 and Task 3 ✓
- `ChatSystem.Instance.IsOpen` used in Task 3 (defined) and Task 4 (consumed) ✓
- `GunSystem.activeSlot` used across Tasks 2 and 4 ✓
