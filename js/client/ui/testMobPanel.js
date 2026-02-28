// ===================== TEST MOB GUI PANEL =====================
// Opened via /testmob command. Lets user select dungeon → floor → mob
// and test them live or frozen without typing commands.

// Panel state
let testMobDungeon = 'azurine';  // 'cave' | 'azurine'
let testMobFloor = 1;
let testMobScroll = 0;
let testMobAbilityPopup = null;  // { typeKey, mobName, abilities[], x, y }

// ===================== MOB ABILITY DESCRIPTIONS =====================
// Human-readable descriptions for every mob special ability.
const MOB_ABILITY_DESCRIPTIONS = {
  // --- Cave mobs (no specials — use built-in AI) ---

  // --- Floor 1: City Streets ---
  swipe_blink:          "Telegraphed dash toward player, heals self on arrival.",
  stun_baton:           "Cone telegraph followed by a stunning melee hit.",
  spot_mark:            "Circle telegraph on player, applies a mark debuff.",
  gas_canister:         "Lobs a projectile that creates a poison zone on landing.",
  ground_pound:         "Circle telegraph + knockback + slow.",
  cloak_backstab:       "Cloaks, then teleports behind player for a surprise attack.",
  sticky_bomb:          "Places a bomb at player position that explodes after a delay.",
  ricochet_round:       "Fires a bouncing sniper shot that ricochets off walls.",
  laser_snipe:          "Long line telegraph followed by heavy damage.",
  tommy_burst:          "Fires a spread of 5 bullets in a cone.",
  smart_mine:           "Drops proximity mines that root and damage on contact.",
  smoke_screen:         "Creates an obscuring smoke zone centered on self.",
  phase_dash:           "Fast dash through player position, dealing damage along the path.",
  bullet_time_field:    "Creates a slow zone centered on the player.",
  afterimage_barrage:   "3 converging line telegraphs from different angles.",
  summon_renegades:     "Spawns 2 random renegade mobs as reinforcements.",

  // --- Floor 2: Tech District ---
  overload_drain:       "Short line telegraph toward player. Drains HP; heals self if player has debuffs.",
  weld_beam:            "Line telegraph toward player that leaves a burning trail hazard.",
  charge_pop:           "Short-range aura that explodes on timer. Knockback + stun.",
  tesla_trail:          "Dash through map leaving an electrified trail that damages and stuns.",
  chain_lightning:      "Lightning bolts jump between nearby targets, chaining root.",
  emp_pulse:            "EMP burst that removes all active hazards and silences player.",
  tesla_pillars:        "4 electric pillars circle the player, then chain lightning between them.",
  magnet_snap:          "Pulls player and self toward each other. Damage on arrival.",
  briefcase_turret:     "Deploys a turret that shoots at the player. Max 2.",
  red_tape_lines:       "2-3 crossing line telegraphs that slow and entangle on contact.",
  penalty_mark:         "Applies permanent mark to player: +25% damage taken. Stacks.",
  drone_swarm:          "Spawns 3-4 attack drones that converge on player. Max 6.",
  dividend_barrage:     "Spread attack telegraphs with money drops.",
  hostile_takeover:     "Pulls player and takes control of their movement for 3 seconds.",
  nda_field:            "Creates a silence zone. Player is silenced and slowed inside.",
  golden_parachute:     "All summons explode; boss regains 30% HP.",

  // --- Floor 3: Junkyard ---
  scavenge_shield:      "Creates a shield zone. Inside: heals self, slows player.",
  mag_pull:             "Pulls player and self toward each other. Knockback on arrival.",
  saw_line:             "Circle telegraph on self, then spins dealing damage in a circle.",
  oil_spill_ignite:     "Phase 1: oil puddle (slow). Phase 2: ignites into burn DoT zone.",
  pile_driver:          "2-tile circle shockwave ahead. Knockback + damage.",
  grab_toss:            "Short range grab, tosses player in a random direction + stun.",
  rebuild:              "Removes half of scrap minions and heals 15% HP per minion removed.",
  scrap_minions:        "Spawns 3-4 scrap minions. Max 6 total.",
  latch_drain:          "Latches onto player, draining 5% HP per tick. Breaks at distance > 150px.",
  mud_dive:             "Dives underground and tunnels toward player, emerging with knockback + stun.",
  acid_spit_arc:        "Arc telegraph toward player. On resolve: acid zone with damage + melt.",
  siphon_beam:          "Line telegraph toward player. Drains health.",
  spore_cloud:          "Expanding poison cloud. Lingers 5 seconds. Damage + poison DoT.",
  burrow_surge:         "Burrows and emerges under player. Shockwave + knockback + slow.",
  toxic_nursery:        "Spawns 3-4 poisonous spore nodes that spread toxins. Max 5.",
  regrowth:             "Heals self 20% HP and converts nearby hazards into healing zones.",

  // --- Floor 4: Trap House ---
  tripwire:             "Places a tripwire line. On contact: slow + entangle.",
  seek_mine:            "Fast dash/lunge toward player from up to 500px away.",
  fake_wall:            "Spawns 2-3 holographic decoy clones. On contact: damage + confuse. Max 3.",
  rewind_tag:           "Marks player position, then after 2 seconds pulls player back to that spot.",
  trap_roulette:        "Random trap effect telegraphs (spike, freeze, stun). Resolves randomly.",
  puzzle_lasers:        "2 rotating laser beams that track the player. Heavy damage if hit.",
  loot_bait:            "Spawns loot decoys. Player drawn toward them. On contact: damage + confuse.",
  remote_hack:          "Remote-control missile. Aim phase then lock-on launch.",
  suppress_cone:        "Cone telegraph followed by stun + silence.",
  barrier_build:        "Creates a barrier wall that blocks movement.",
  rocket_dash:          "Dashes backward leaving a rocket trail hazard. Damage + knockback.",
  emp_dome:             "Large EMP dome. Removes active hazards + silences player inside.",
  pulse_override:       "Overrides player input for 2 seconds with random movement commands.",
  repulsor_beam:        "Persistent energy beam that tracks player. Pushes back on hit.",
  nano_armor:           "Self-shield: reduces incoming damage by 50% for 5 seconds.",
  drone_court:          "Summons 3 keeper drones that guard a zone. Max 6 total.",

  // --- Floor 5: Waste Planet ---
  bleed_maul:           "Melee swipe that applies bleed DoT.",
  gore_spore_burst:     "Explodes into gore spore projectiles. Damage + poison on hit.",
  pounce_pin:           "Leaps to player and pins them (stun for 1 second). Damage on land.",
  screech_ring:         "Sonic wave around mob. Damage + disorient in ring.",
  slime_wave_slash:     "Line slash that leaves a slime trail (slow zone).",
  sticky_field:         "Sticky zone around mob. Slows player inside. Expands over time.",
  split_response:       "Splits into 2 smaller versions (40% HP each, 70% speed).",
  glow_mark:            "Marks player with bioluminescent glow. +20% damage taken for 5 seconds.",
  symbiote_lash:        "Whip attack. On hit: drains 2% player HP per second, heals self.",
  toxic_spikes:         "Spike protrusions. Damages + poisons on melee contact.",
  adrenal_surge:        "Self-buff: +50% damage, +30% speed for 6 seconds.",
  absorb_barrier:       "Shield that absorbs damage. Converts 50% of absorbed into heal.",
  static_orbs:          "Summons 3-4 orbiting orbs. Stuns on contact. Max 6.",
  overcharge_dump:      "AoE stun burst around self. Damages + stuns all in radius.",
  ooze_blade_arc:       "Arc slash that leaves an ooze trail (slow + acid damage).",
  slime_rampart:        "Builds a slime wall that blocks movement + damages on contact. Max 2.",
  melt_floor:           "Heats floor in a circle. Becomes lava zone (high DoT + slow).",
  summon_elite:         "Summons 1 elite minion with custom abilities (scales with wave).",
  shadow_teleport:      "Blinks to player position, quick attack, then vanishes.",
  puppet_shot:          "Fires projectile. On hit: player is briefly controlled.",
  abyss_grasp:          "Dark circle telegraph at player. On resolve: pull + damage + slow.",
  regen_veil:           "Self-heal over 4 seconds. Regenerates 10% max HP.",
};

// Dungeon → Floor → Mob mapping
const TESTMOB_DUNGEONS = {
  cave: {
    name: 'Cave Dungeon',
    floors: {
      1: { name: 'Cave Floor 1', mobs: ['grunt', 'runner', 'tank', 'witch', 'skeleton', 'mummy', 'archer', 'healer', 'golem', 'mini_golem'] },
      2: { name: 'Cave Floor 2', mobs: ['grunt', 'runner', 'tank', 'witch', 'skeleton', 'mummy', 'archer', 'healer', 'golem', 'mini_golem'] },
      3: { name: 'Cave Floor 3', mobs: ['grunt', 'runner', 'tank', 'witch', 'skeleton', 'mummy', 'archer', 'healer', 'golem', 'mini_golem'] },
      4: { name: 'Cave Floor 4', mobs: ['grunt', 'runner', 'tank', 'witch', 'skeleton', 'mummy', 'archer', 'healer', 'golem', 'mini_golem'] },
      5: { name: 'Cave Floor 5', mobs: ['grunt', 'runner', 'tank', 'witch', 'skeleton', 'mummy', 'archer', 'healer', 'golem', 'mini_golem'] },
    }
  },
  azurine: {
    name: 'Azurine City',
    floors: {
      1: { name: 'Floor 1 — City Streets', mobs: ['neon_pickpocket', 'cyber_mugger', 'drone_lookout', 'street_chemist', 'renegade_bruiser', 'renegade_shadowknife', 'renegade_demo', 'renegade_sniper', 'the_don', 'velocity'] },
      2: { name: 'Floor 2 — Tech District', mobs: ['circuit_thief', 'arc_welder', 'battery_drone', 'coil_runner', 'suit_enforcer', 'compliance_officer', 'contract_assassin', 'executive_handler', 'voltmaster', 'e_mortis'] },
      3: { name: 'Floor 3 — Junkyard', mobs: ['scrap_rat', 'magnet_scavenger', 'rust_sawman', 'junkyard_pyro', 'toxic_leechling', 'bog_stalker', 'chem_frog', 'mosquito_drone', 'mourn', 'centipede'] },
      4: { name: 'Floor 4 — Trap House', mobs: ['tripwire_tech', 'gizmo_hound', 'holo_jester', 'time_prankster', 'enforcer_drone', 'synth_builder', 'shock_trooper', 'signal_jammer', 'game_master', 'junz'] },
      5: { name: 'Floor 5 — Waste Planet', mobs: ['rabid_hyenaoid', 'spore_stag', 'wasteland_raptor', 'plague_batwing', 'gel_swordsman', 'viscosity_mage', 'core_guardian', 'biolum_drone', 'lehvius', 'jackman', 'malric', 'vale'] },
    }
  }
};

// Validate TESTMOB_DUNGEONS floor counts match DUNGEON_REGISTRY
if (typeof DUNGEON_REGISTRY !== 'undefined') {
  for (const [key, reg] of Object.entries(DUNGEON_REGISTRY)) {
    const td = TESTMOB_DUNGEONS[key];
    if (!td) { console.warn('TESTMOB_DUNGEONS missing dungeon:', key); continue; }
    const floorCount = Object.keys(td.floors).length;
    if (floorCount !== reg.maxFloors)
      console.warn('TESTMOB_DUNGEONS ' + key + ': ' + floorCount + ' floors but registry says ' + reg.maxFloors);
  }
}

UI.register('testmob', {
  onOpen() { testMobScroll = 0; testMobAbilityPopup = null; },
  onClose() { testMobScroll = 0; testMobAbilityPopup = null; },
});

// ===================== SPAWN TEST MOB =====================
function _testmobSpawn(typeKey, mode) {
  // Enter test arena if not already there
  if (!Scene.inTestArena) {
    enterLevel('test_arena', 18, 10);
    dungeonFloor = testMobFloor;
    window._opMode = true;
    player.hp = player.maxHp = 10000;
    gold = 999999;
    currentDungeon = testMobDungeon;
  }
  // Clear previous
  mobs.length = 0; bullets.length = 0; hitEffects.length = 0;
  if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.clear();
  if (typeof HazardSystem !== 'undefined') HazardSystem.clear();
  player.hp = player.maxHp;
  // Spawn mob
  const mob = createMob(typeKey, player.x + 150, player.y, 1, 1);
  if (mob) {
    if (mode !== 'live') { mob.speed = 0; mob._specialTimer = 99999; }
    mobs.push(mob);
    const label = mode === 'live' ? ' [LIVE]' : ' [FROZEN]';
    chatMessages.push({ name: "SYSTEM", text: "Testing: " + (mob.name || typeKey) + label, time: Date.now() });
  }
}

// ===================== DRAW PANEL =====================
function drawTestMobPanel() {
  if (!UI.isOpen('testmob')) return;

  const pw = 700, ph = 520;
  const px = (BASE_W - pw) / 2, py = (BASE_H - ph) / 2;

  // Dimmed backdrop
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Panel bg
  ctx.fillStyle = "#0a0e18";
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.fill();
  ctx.strokeStyle = "rgba(100,180,220,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.stroke();

  // Header bar
  ctx.fillStyle = "rgba(20,40,60,0.6)";
  ctx.beginPath(); ctx.roundRect(px + 3, py + 3, pw - 6, 44, [12,12,0,0]); ctx.fill();
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = "#66ccff";
  ctx.textAlign = "center";
  ctx.fillText("🧪  MOB TESTER", px + pw/2, py + 31);

  // Close button
  ctx.fillStyle = PALETTE.closeBtn;
  ctx.beginPath(); ctx.roundRect(px + pw - 42, py + 8, 32, 32, 6); ctx.fill();
  ctx.font = "bold 20px monospace"; ctx.fillStyle = "#fff";
  ctx.textAlign = "center"; ctx.fillText("✕", px + pw - 26, py + 30);

  // ===== LEFT SIDEBAR: Dungeon + Floor selection =====
  const sideW = 180;
  const sideX = px + 12;
  const sideY = py + 56;
  const sideH = ph - 68;

  ctx.fillStyle = "rgba(15,20,30,0.8)";
  ctx.beginPath(); ctx.roundRect(sideX, sideY, sideW, sideH, 8); ctx.fill();

  // Dungeon buttons
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  const dungeonKeys = Object.keys(TESTMOB_DUNGEONS);
  const dungBtnH = 30, dungBtnGap = 6;
  let dungBtnY = sideY + 10;

  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#888";
  ctx.fillText("DUNGEON", sideX + sideW/2, dungBtnY + 8);
  dungBtnY += 20;

  for (const dk of dungeonKeys) {
    const dInfo = TESTMOB_DUNGEONS[dk];
    const active = dk === testMobDungeon;
    ctx.fillStyle = active ? "rgba(60,140,200,0.3)" : "rgba(30,35,50,0.8)";
    ctx.beginPath(); ctx.roundRect(sideX + 8, dungBtnY, sideW - 16, dungBtnH, 6); ctx.fill();
    if (active) {
      ctx.strokeStyle = "#66ccff"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(sideX + 8, dungBtnY, sideW - 16, dungBtnH, 6); ctx.stroke();
    }
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = active ? "#66ccff" : "#999";
    ctx.fillText(dInfo.name, sideX + sideW/2, dungBtnY + 20);
    dungBtnY += dungBtnH + dungBtnGap;
  }

  // Floor buttons
  dungBtnY += 10;
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#888";
  ctx.textAlign = "center";
  ctx.fillText("FLOOR", sideX + sideW/2, dungBtnY + 8);
  dungBtnY += 20;

  const dungData = TESTMOB_DUNGEONS[testMobDungeon];
  const floorKeys = Object.keys(dungData.floors).map(Number).sort((a,b) => a - b);
  for (const fk of floorKeys) {
    const fInfo = dungData.floors[fk];
    const active = fk === testMobFloor;
    ctx.fillStyle = active ? "rgba(60,200,120,0.2)" : "rgba(30,35,50,0.8)";
    ctx.beginPath(); ctx.roundRect(sideX + 8, dungBtnY, sideW - 16, dungBtnH, 6); ctx.fill();
    if (active) {
      ctx.strokeStyle = PALETTE.accent; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(sideX + 8, dungBtnY, sideW - 16, dungBtnH, 6); ctx.stroke();
    }
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = active ? PALETTE.accent : "#999";
    ctx.fillText("Floor " + fk, sideX + sideW/2, dungBtnY + 20);
    dungBtnY += dungBtnH + dungBtnGap;
  }

  // ===== RIGHT AREA: Mob grid =====
  const gridX = sideX + sideW + 12;
  const gridY = sideY;
  const gridW = pw - sideW - 36;
  const gridH = sideH;

  ctx.fillStyle = "rgba(15,20,30,0.5)";
  ctx.beginPath(); ctx.roundRect(gridX, gridY, gridW, gridH, 8); ctx.fill();

  // Floor title
  const floorData = dungData.floors[testMobFloor];
  if (!floorData) return;
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "#aaa";
  ctx.textAlign = "left";
  ctx.fillText(floorData.name, gridX + 10, gridY + 18);

  // Mob cards
  const cardW = (gridW - 30) / 2;  // 2 columns
  const cardH = 52;
  const cardGap = 6;
  const cardStartY = gridY + 30;
  const maxVisibleCards = Math.floor((gridH - 40) / (cardH + cardGap));

  // Clamp scroll
  const totalCards = floorData.mobs.length;
  const totalRows = Math.ceil(totalCards / 2);
  const maxScroll = Math.max(0, totalRows - maxVisibleCards);
  testMobScroll = Math.max(0, Math.min(testMobScroll, maxScroll));

  ctx.save();
  ctx.beginPath();
  ctx.rect(gridX, cardStartY - 2, gridW, gridH - 38);
  ctx.clip();

  for (let i = 0; i < floorData.mobs.length; i++) {
    const typeKey = floorData.mobs[i];
    const mt = MOB_TYPES[typeKey];
    if (!mt) continue;

    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = gridX + 8 + col * (cardW + 8);
    const cy = cardStartY + (row - testMobScroll) * (cardH + cardGap);

    // Skip if out of view
    if (cy + cardH < cardStartY - 2 || cy > gridY + gridH) continue;

    const isBoss = mt.isBoss || (mt._specials && mt._specials.length > 1);

    // Card background
    ctx.fillStyle = isBoss ? "rgba(60,30,20,0.6)" : "rgba(25,30,45,0.8)";
    ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 8); ctx.fill();
    ctx.strokeStyle = isBoss ? "rgba(255,120,60,0.4)" : "rgba(80,120,160,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 8); ctx.stroke();

    // Mob color swatch
    ctx.fillStyle = mt.shirt || mt.skin || "#666";
    ctx.beginPath(); ctx.roundRect(cx + 6, cy + 8, 10, 10, 3); ctx.fill();
    ctx.fillStyle = mt.pants || mt.hair || "#444";
    ctx.beginPath(); ctx.roundRect(cx + 6, cy + 22, 10, 10, 3); ctx.fill();

    // Mob name
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = isBoss ? "#ff9966" : "#ccc";
    const displayName = (mt.name || typeKey).substring(0, 16);
    ctx.fillText(displayName, cx + 22, cy + 17);

    // Stats
    ctx.font = "10px monospace";
    ctx.fillStyle = "#777";
    ctx.fillText("HP:" + mt.hp + " SPD:" + (mt.speed || 0).toFixed(1) + " DMG:" + (mt.damage || 0), cx + 22, cy + 30);

    // Boss badge
    if (isBoss) {
      ctx.fillStyle = "rgba(255,80,40,0.2)";
      ctx.beginPath(); ctx.roundRect(cx + 22, cy + 34, 34, 14, 3); ctx.fill();
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = "#ff7744";
      ctx.fillText("BOSS", cx + 28, cy + 44);
    }

    // Frozen button
    const btnW = 50, btnH = 20;
    const frozenX = cx + cardW - btnW * 2 - 12;
    const frozenY = cy + 6;
    ctx.fillStyle = "rgba(60,120,200,0.3)";
    ctx.beginPath(); ctx.roundRect(frozenX, frozenY, btnW, btnH, 4); ctx.fill();
    ctx.strokeStyle = "rgba(80,160,255,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(frozenX, frozenY, btnW, btnH, 4); ctx.stroke();
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#88bbff";
    ctx.textAlign = "center";
    ctx.fillText("FROZEN", frozenX + btnW/2, frozenY + 14);

    // Live button
    const liveX = cx + cardW - btnW - 6;
    const liveY = cy + 6;
    ctx.fillStyle = "rgba(200,80,60,0.3)";
    ctx.beginPath(); ctx.roundRect(liveX, liveY, btnW, btnH, 4); ctx.fill();
    ctx.strokeStyle = "rgba(255,100,80,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(liveX, liveY, btnW, btnH, 4); ctx.stroke();
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#ff8866";
    ctx.textAlign = "center";
    ctx.fillText("LIVE", liveX + btnW/2, liveY + 14);
  }

  ctx.restore();

  // Scroll indicator
  if (totalRows > maxVisibleCards) {
    const scrollBarH = gridH - 40;
    const thumbH = Math.max(20, scrollBarH * (maxVisibleCards / totalRows));
    const thumbY = cardStartY + (testMobScroll / maxScroll) * (scrollBarH - thumbH);
    ctx.fillStyle = "rgba(100,150,200,0.2)";
    ctx.beginPath(); ctx.roundRect(gridX + gridW - 10, cardStartY, 6, scrollBarH, 3); ctx.fill();
    ctx.fillStyle = "rgba(100,180,255,0.5)";
    ctx.beginPath(); ctx.roundRect(gridX + gridW - 10, thumbY, 6, thumbH, 3); ctx.fill();
  }

  // ===== MOB CARD (right-click — matches inventory card style) =====
  if (testMobAbilityPopup) {
    _drawMobCard(testMobAbilityPopup);
  }
}

// ===================== MOB CARD (item-card style) =====================
function _drawMobCard(pop) {
  const mt = MOB_TYPES[pop.typeKey];
  if (!mt) return;

  const accentCol = pop.isBoss ? "#ff9966" : "#66ccff";
  const accentDim = pop.isBoss ? "rgba(255,140,80,0.35)" : "rgba(80,180,255,0.35)";

  // Card dimensions — centered on screen
  const cw = 260, ch = 420;
  const cx = (BASE_W - cw) / 2;
  const cy = (BASE_H - ch) / 2;

  // Dim background
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Card background
  ctx.fillStyle = "#1c1a16";
  ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 12); ctx.fill();

  // Outer border glow
  ctx.shadowColor = accentCol;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = accentCol;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 12); ctx.stroke();
  ctx.shadowBlur = 0;

  // Inner border
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(cx + 6, cy + 6, cw - 12, ch - 12, 8); ctx.stroke();

  // === BOSS BADGE (top-left) ===
  if (pop.isBoss) {
    const badgeW = 50, badgeH = 22;
    const bx = cx + 10, by = cy + 10;
    ctx.fillStyle = "#ff7744";
    ctx.beginPath(); ctx.roundRect(bx, by, badgeW, badgeH, 6); ctx.fill();
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.fillText("BOSS", bx + badgeW / 2, by + 15);
  }

  // === HP BADGE (top-right) ===
  const hpBadgeW = 60, hpBadgeH = 22;
  const hbx = cx + cw - hpBadgeW - 10, hby = cy + 10;
  ctx.fillStyle = "rgba(40,80,40,0.8)";
  ctx.beginPath(); ctx.roundRect(hbx, hby, hpBadgeW, hpBadgeH, 6); ctx.fill();
  ctx.strokeStyle = "rgba(80,200,80,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(hbx, hby, hpBadgeW, hpBadgeH, 6); ctx.stroke();
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "#88dd88";
  ctx.textAlign = "center";
  ctx.fillText("HP " + mt.hp, hbx + hpBadgeW / 2, hby + 15);

  // === ART AREA (mob character portrait) ===
  const artX = cx + 20, artY = cy + 44, artW = cw - 40, artH = 100;
  const artGrad = ctx.createLinearGradient(artX, artY, artX, artY + artH);
  artGrad.addColorStop(0, "rgba(30,28,40,0.9)");
  artGrad.addColorStop(1, "rgba(20,18,30,0.9)");
  ctx.fillStyle = artGrad;
  ctx.beginPath(); ctx.roundRect(artX, artY, artW, artH, 6); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(artX, artY, artW, artH, 6); ctx.stroke();

  // Draw mob character in art area
  const charCx = artX + artW / 2;
  const charCy = artY + artH / 2 + 16;
  ctx.save();
  ctx.beginPath();
  ctx.rect(artX, artY, artW, artH);
  ctx.clip();
  if (typeof drawChar === 'function') {
    drawChar(charCx, charCy, 0, 0, false,
      mt.skin || "#888", mt.hair || "#444", mt.shirt || "#666", mt.pants || "#555",
      null, mt.hp, false, pop.typeKey, mt.hp, 0, mt.mobScale || 1, 0);
  }
  ctx.restore();

  // === MOB NAME ===
  const nameY = artY + artH + 22;
  ctx.font = "bold 16px monospace";
  ctx.fillStyle = accentCol;
  ctx.textAlign = "center";
  ctx.fillText(pop.mobName, cx + cw / 2, nameY);

  // Type subtitle
  ctx.font = "11px monospace";
  ctx.fillStyle = "#777";
  const roleLabel = pop.isBoss ? "BOSS" : "MOB";
  const aiLabel = (mt.ai || 'melee').toUpperCase();
  ctx.fillText(roleLabel + " · " + aiLabel, cx + cw / 2, nameY + 16);

  // === DIVIDER ===
  let divY = nameY + 26;
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx + 20, divY); ctx.lineTo(cx + cw - 20, divY); ctx.stroke();

  // === STATS ===
  ctx.textAlign = "left";
  let statY = divY + 18;
  const statX = cx + 22;
  const valX = cx + cw - 22;
  const lineH = 17;

  function drawStat(label, value, color) {
    ctx.font = "11px monospace";
    ctx.fillStyle = "#999";
    ctx.textAlign = "left";
    ctx.fillText(label, statX, statY);
    ctx.fillStyle = color || "#e0e0e0";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(value, valX, statY);
    statY += lineH;
  }

  drawStat("HP", String(mt.hp), "#88dd88");
  drawStat("Speed", (mt.speed || 0).toFixed(1), "#88bbff");
  drawStat("Damage", String(mt.damage || 0), "#ff8866");
  if (mt.killHeal) drawStat("Kill Heal", String(mt.killHeal), "#aaddaa");

  // === DIVIDER 2 ===
  statY += 2;
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath(); ctx.moveTo(cx + 20, statY - 6); ctx.lineTo(cx + cw - 20, statY - 6); ctx.stroke();
  statY += 4;

  // === ABILITIES HEADER ===
  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "#aaa";
  ctx.textAlign = "center";
  ctx.fillText("— ABILITIES —", cx + cw / 2, statY);
  statY += 14;

  // === ABILITIES LIST ===
  const maxDescY = cy + ch - 24; // leave room for footer
  ctx.textAlign = "left";
  const descMaxW = cw - 44;

  if (pop.abilities && pop.abilities.length > 0) {
    for (const ab of pop.abilities) {
      if (statY > maxDescY) break;
      // Ability name
      const prettyName = ab.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#eebb55";
      ctx.fillText("▸ " + prettyName, statX, statY);
      statY += 14;

      // Ability description — word wrap
      ctx.font = "10px monospace";
      ctx.fillStyle = "#aabbcc";
      const words = ab.desc.split(' ');
      let line = '';
      for (const word of words) {
        if (statY > maxDescY) break;
        const test = line + (line ? ' ' : '') + word;
        if (ctx.measureText(test).width > descMaxW && line) {
          ctx.fillText("  " + line, statX, statY);
          statY += 13;
          line = word;
        } else {
          line = test;
        }
      }
      if (line && statY <= maxDescY) {
        ctx.fillText("  " + line, statX, statY);
        statY += 16;
      }
    }
  } else if (pop.extraInfo) {
    ctx.font = "10px monospace";
    ctx.fillStyle = "#aabbcc";
    for (const info of pop.extraInfo) {
      if (statY > maxDescY) break;
      const words = info.split(' ');
      let line = '';
      for (const word of words) {
        if (statY > maxDescY) break;
        const test = line + (line ? ' ' : '') + word;
        if (ctx.measureText(test).width > descMaxW && line) {
          ctx.fillText("  " + line, statX, statY);
          statY += 13;
          line = word;
        } else {
          line = test;
        }
      }
      if (line && statY <= maxDescY) {
        ctx.fillText("  " + line, statX, statY);
        statY += 16;
      }
    }
  }

  // === FOOTER ===
  ctx.font = "9px monospace";
  ctx.fillStyle = "#444";
  ctx.textAlign = "center";
  ctx.fillText("Click anywhere to close", cx + cw / 2, cy + ch - 10);
  ctx.textAlign = "left";
}

// ===================== CLICK HANDLER =====================
function handleTestMobClick(mx, my) {
  if (!UI.isOpen('testmob')) return false;

  // Dismiss mob card on any left click (consume the click — don't pass through)
  if (testMobAbilityPopup) { testMobAbilityPopup = null; return true; }

  const pw = 700, ph = 520;
  const px = (BASE_W - pw) / 2, py = (BASE_H - ph) / 2;

  // Close button
  if (mx >= px + pw - 42 && mx <= px + pw - 10 && my >= py + 8 && my <= py + 40) {
    UI.close(); return true;
  }

  // Click outside panel = close
  if (mx < px || mx > px + pw || my < py || my > py + ph) {
    UI.close(); return true;
  }

  // Sidebar area
  const sideW = 180;
  const sideX = px + 12;
  const sideY = py + 56;

  // Dungeon buttons
  const dungeonKeys = Object.keys(TESTMOB_DUNGEONS);
  const dungBtnH = 30, dungBtnGap = 6;
  let dungBtnY = sideY + 30; // skip "DUNGEON" label

  for (const dk of dungeonKeys) {
    if (mx >= sideX + 8 && mx <= sideX + sideW - 8 &&
        my >= dungBtnY && my <= dungBtnY + dungBtnH) {
      testMobDungeon = dk;
      // Reset floor to first available
      const floors = Object.keys(TESTMOB_DUNGEONS[dk].floors).map(Number).sort((a,b) => a-b);
      testMobFloor = floors[0] || 1;
      testMobScroll = 0;
      return true;
    }
    dungBtnY += dungBtnH + dungBtnGap;
  }

  // Floor buttons
  dungBtnY += 30; // skip gap + "FLOOR" label
  const dungData = TESTMOB_DUNGEONS[testMobDungeon];
  const floorKeys = Object.keys(dungData.floors).map(Number).sort((a,b) => a - b);
  for (const fk of floorKeys) {
    if (mx >= sideX + 8 && mx <= sideX + sideW - 8 &&
        my >= dungBtnY && my <= dungBtnY + dungBtnH) {
      testMobFloor = fk;
      testMobScroll = 0;
      return true;
    }
    dungBtnY += dungBtnH + dungBtnGap;
  }

  // Mob grid area
  const gridX = sideX + sideW + 12;
  const gridY = sideY;
  const gridW = pw - sideW - 36;
  const gridH = ph - 68;
  const cardW = (gridW - 30) / 2;
  const cardH = 52;
  const cardGap = 6;
  const cardStartY = gridY + 30;

  const floorData = dungData.floors[testMobFloor];
  if (!floorData) return true;

  for (let i = 0; i < floorData.mobs.length; i++) {
    const typeKey = floorData.mobs[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = gridX + 8 + col * (cardW + 8);
    const cy = cardStartY + (row - testMobScroll) * (cardH + cardGap);

    // Skip if out of view
    if (cy + cardH < cardStartY || cy > gridY + gridH) continue;

    // Check Frozen button
    const btnW = 50, btnH = 20;
    const frozenX = cx + cardW - btnW * 2 - 12;
    const frozenY = cy + 6;
    if (mx >= frozenX && mx <= frozenX + btnW && my >= frozenY && my <= frozenY + btnH) {
      _testmobSpawn(typeKey, 'frozen');
      UI.close();
      return true;
    }

    // Check Live button
    const liveX = cx + cardW - btnW - 6;
    const liveY = cy + 6;
    if (mx >= liveX && mx <= liveX + btnW && my >= liveY && my <= liveY + btnH) {
      _testmobSpawn(typeKey, 'live');
      UI.close();
      return true;
    }
  }

  return true; // consume click even if nothing hit (we're in panel)
}

// ===================== SCROLL HANDLER =====================
function handleTestMobScroll(delta) {
  if (!UI.isOpen('testmob')) return false;
  testMobScroll += delta > 0 ? 1 : -1;
  // Clamp happens in draw
  const dungData = TESTMOB_DUNGEONS[testMobDungeon];
  const floorData = dungData ? dungData.floors[testMobFloor] : null;
  if (floorData) {
    const totalRows = Math.ceil(floorData.mobs.length / 2);
    const gridH = 520 - 68;
    const maxVisible = Math.floor((gridH - 40) / (52 + 6));
    const maxScroll = Math.max(0, totalRows - maxVisible);
    testMobScroll = Math.max(0, Math.min(testMobScroll, maxScroll));
  }
  return true;
}

// ===================== RIGHT-CLICK HANDLER =====================
// Right-click on a mob card → show ability info popup
function handleTestMobRightClick(mx, my) {
  if (!UI.isOpen('testmob')) return false;

  // If popup is already showing, dismiss it
  if (testMobAbilityPopup) { testMobAbilityPopup = null; return true; }

  const pw = 700, ph = 520;
  const px = (BASE_W - pw) / 2, py = (BASE_H - ph) / 2;

  // Only handle clicks inside panel
  if (mx < px || mx > px + pw || my < py || my > py + ph) return false;

  // Mob grid area
  const sideW = 180;
  const sideX = px + 12;
  const sideY = py + 56;
  const gridX = sideX + sideW + 12;
  const gridY = sideY;
  const gridW = pw - sideW - 36;
  const gridH = ph - 68;
  const cardW = (gridW - 30) / 2;
  const cardH = 52;
  const cardGap = 6;
  const cardStartY = gridY + 30;

  const dungData = TESTMOB_DUNGEONS[testMobDungeon];
  const floorData = dungData ? dungData.floors[testMobFloor] : null;
  if (!floorData) return true;

  for (let i = 0; i < floorData.mobs.length; i++) {
    const typeKey = floorData.mobs[i];
    const mt = MOB_TYPES[typeKey];
    if (!mt) continue;

    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = gridX + 8 + col * (cardW + 8);
    const cy = cardStartY + (row - testMobScroll) * (cardH + cardGap);

    if (cy + cardH < cardStartY || cy > gridY + gridH) continue;

    // Hit test the card area
    if (mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH) {
      const specials = mt._specials || [];
      const abilities = specials.map(key => ({
        key,
        desc: MOB_ABILITY_DESCRIPTIONS[key] || "Unknown ability.",
      }));

      // Cave mobs without specials — show their built-in AI info
      let extraInfo = null;
      if (specials.length === 0) {
        const parts = [];
        if (mt.summonRate)  parts.push("Summons minions every " + (mt.summonRate / 60).toFixed(1) + "s");
        if (mt.boulderRate) parts.push("Throws boulders every " + (mt.boulderRate / 60).toFixed(1) + "s");
        if (mt.arrowRate)   parts.push("Shoots arrows every " + (mt.arrowRate / 60).toFixed(1) + "s");
        if (mt.healRadius)  parts.push("Heals nearby mobs within " + mt.healRadius + "px");
        if (mt.explodeRange) parts.push("Suicide bomber: explodes for " + mt.explodeDamage + " damage");
        if (parts.length === 0) parts.push("Basic melee attacker — no special abilities.");
        extraInfo = parts;
      }

      testMobAbilityPopup = {
        typeKey,
        mobName: mt.name || typeKey,
        abilities,
        extraInfo,
        isBoss: mt.isBoss || (specials.length > 1),
        x: mx,
        y: my,
      };
      return true;
    }
  }

  return true; // consume right-click inside panel
}
