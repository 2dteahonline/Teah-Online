// ===================== TEST MOB GUI PANEL =====================
// Opened via /testmob command. Lets user select dungeon → floor → mob
// and test them live or frozen without typing commands.

// Panel state
let testMobDungeon = 'azurine';  // 'cave' | 'azurine' | 'vortalis' | 'dungeon_4'
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

  // --- Vortalis Floor 1: Pirate Shores / Naval Fleet ---
  shiv_lunge:           "Dash 200px toward player, damage on arrival.",
  barrel_drop:          "Drops an explosive barrel. Detonates after 1.5s for AoE damage.",
  scattershot:          "Fires 5 bullets in a cone spread.",
  anchor_sweep:         "180° melee sweep. Damage + slow on hit.",
  flintlock_volley:     "Fires 5 bullets in a fan toward player.",
  cutlass_cleave:       "Telegraphed cone attack. Damage + slow.",
  call_to_arms:         "Buffs all nearby allies with +20% speed.",
  weathered_resolve:    "Self-heal 12% max HP.",
  boarding_rush:        "Dash 250px to player. Stun on arrival.",
  tower_shield:         "Activates damage-blocking shield for 3 seconds.",
  water_geyser:         "Telegraphed circle at player. Erupts for damage + slow.",
  piercing_musket:      "High-damage piercing shot that passes through targets.",
  reckless_charge:      "Heavy charge toward player. Self-stuns if hits wall.",
  naval_artillery:      "3 circle telegraphs near player. Each stuns on hit.",
  spectral_chain_binding: "Circle telegraph at player. Applies tether debuff.",
  tattered_tide:        "Wide wave telegraph. Damage + pushback.",
  command_authority:     "Buffs all allies +30% damage. Self +20% speed.",
  admirals_resolve:     "Self-heal + frontal shield for 3 seconds.",

  // --- Vortalis Floor 2: Jungle / Blood Cove ---
  spear_dash:           "Quick dash to player with spear. Damage along path.",
  toxic_trail:          "Leaves poison trail for 3 seconds while moving.",
  paralysis_dart:       "Dart projectile that roots player for 0.7s.",
  earthquake_slam:      "AoE slam 120px. Stun 0.5s.",
  spear_barrage:        "Fires 6 spears rapidly over 18 frames.",
  vine_snare:           "Circle telegraph. Root + slow zone on resolve.",
  primal_roar:          "AoE stun 160px radius. Damage + 0.6s stun.",
  tribal_summon:        "Summons 2 jungle_headhunter reinforcements.",
  jungle_fury:          "Self-buff: +50% speed, +40% damage for 5 seconds.",
  blood_frenzy:         "Self-buff: +40% speed, +30% damage for 3 seconds.",
  shard_spread:         "3 crystal shards in fan. Slow on hit.",
  blood_pool:           "Creates healing zone. Heals mob while standing in it.",
  hamstring_bite:       "Melee bite. Applies slow + bleed.",
  chain_grapple:        "Line telegraph. Pulls player 120px toward mob.",
  crimson_cleave:       "Wide cone telegraph. Heavy damage + bleed.",
  shard_of_betrayal:    "8 crystal bullets in a ring. Slow on hit.",
  blood_siphon:         "Circle telegraph on self. Damage + heals mob.",
  bone_guard:           "Summons 2 bone_clad_brute minions.",
  demonic_shift:        "Teleport near player. AoE damage + speed/damage buff.",

  // --- Vortalis Floor 3: Moonlit Docks / Ghost Ship ---
  rabid_pounce:         "Pounce dash to player. Stun 0.5s on hit.",
  pack_howl:            "Buffs all nearby allies +30% speed for 4 seconds.",
  spectral_tether:      "Tethers player to a point. Pulls back if too far.",
  quick_draw:           "Fast piercing shot toward player.",
  feral_slash:          "Close-range slash. Damage + bleed.",
  predator_dash:        "Phase behind player for a backstab.",
  hunters_mark:         "Marks player: +25% damage taken for 3 seconds.",
  howl_of_terror:       "AoE fear 200px. Player flees randomly.",
  pack_instinct:        "Buff self + summon 1 wolf minion.",
  silver_fang_strike:   "Telegraph then heavy dash. Damage + bleed.",
  alpha_rampage:        "3 rapid dashes in succession.",
  phase_lunge:          "Teleport behind player, backstab attack.",
  soul_bullet:          "Homing ghost projectile.",
  wail_of_depths:       "AoE 180px. Fear + pushback.",
  sticky_trap:          "Places root trap. Arms after 0.5s.",
  phantom_slash:        "Slash from behind. Damage + confuse.",
  ghost_dash:           "Ghostly dash through player. Afterimages + damage.",
  haunted_cutlass:      "Close-range slash. Damage + disorient.",
  spirit_shield:        "Invulnerable for 1.5 seconds.",
  cursed_mark:          "Marks player: +30% damage taken.",
  spectral_crew:        "Summons 2 ghost minions.",
  soul_drain:           "Telegraphed channel. Damage + heals mob.",
  ghost_ship:           "5 line telegraphs in a fan. Staggered timing.",

  // --- Vortalis Floor 4: Sunken Reef / Abyssal Trench ---
  blinding_ink:         "Ink blob at player. Blinds for 1.5 seconds.",
  coral_barricade:      "Spawns coral slow zone between mob and player.",
  tentacle_bind:        "Circle telegraph at player. Root 1 second.",
  sticky_trap:          "Places root trap on ground.",
  tentacle_grab:        "Line telegraph. Pulls player + root on hit.",
  coral_armor:          "Self-buff: 50% damage reduction for 3 seconds.",
  ink_blast:            "AoE circle on self. Damage + blind 2 seconds.",
  tidal_slam:           "Heavy AoE 140px. Damage + stun.",
  barnacle_trap_boss:   "Places 3 root traps near player.",
  ocean_regen:          "Self-heal over 5 seconds. 10% max HP total.",
  deep_sea_strike:      "Dash 300px. Heavy damage + armor break.",
  kraken_call:          "Summons 2 trench_tentacle minions.",
  tidal_lunge:          "Water dash. Leaves slow zones along path.",
  wealth_volley:        "8 coin bullets in a circle.",
  abyssal_slam:         "Heavy AoE 150px. High damage.",
  pressure_zone:        "Creates slow zone at player position.",
  deepsea_decapitation: "Heavy line telegraph. Massive damage + bleed.",
  coiling_constriction: "Circle telegraph. Root + slow + hazard zone.",
  gilded_maelstrom:     "12 bullets in expanding spiral.",
  pressure_zone_boss:   "2 large slow zones near player.",
  silt_cloud:           "Hazard zone at player. Blinds if in range.",
  abyssal_roar:         "AoE 200px. Damage + fear.",
  golden_retribution:   "Reflects projectiles for 3 seconds.",
  reign_of_deep:        "Massive AoE + stun + 4 hazard zones.",

  // --- Vortalis Floor 5: Coral Throne / Ocean Temple ---
  royal_thrust:         "Spear thrust 180px line toward player.",
  crashing_surf:        "Water wave toward player. Damage + push.",
  shard_glide:          "Glide dash. Leaves crystal shards behind.",
  aegis_reflect:        "Reflects projectiles for 2 seconds.",
  golden_shard_volley:  "10 golden shards in arc. Some homing.",
  abyssal_maw:          "Large circle telegraph. Heavy damage + pull + armor break.",
  coral_aegis:          "Self-buff: shield + reflect for 2.5 seconds.",
  royal_gilded_beam:    "Long line telegraph. Heavy damage + burn trail.",
  tidal_surge:          "Wide wave telegraph. Damage + push + slow trail.",
  sovereigns_cage:      "16 bullets ring around player, converging inward.",
  blessing_of_deep:     "Self-heal 15% + heals all nearby allies.",
  reign_gilded_reef:    "5 circle telegraphs in cross. Damage + hazard zones.",
  leviathan_lunge:      "Serpentine dash + AoE explosion on arrival.",
  venom_spit:           "Poison projectile. Applies poison DoT.",
  pincer_guillotine:    "Close-range snap. Damage + mark debuff.",
  abyssal_undertow:     "Pull player toward mob + slow.",
  leviathans_fang:      "Serpentine dash. Heavy damage + bleed.",
  serpents_strike:      "3 parallel line telegraphs toward player.",
  tidal_trample:        "Heavy charge 350px. Slow zones + stun.",
  abyssal_undertow_mw:  "AoE pull 180px. Damage + slow + hazard zone.",
  divine_deluge:        "Reflect + 8 water bullets outward.",
  oceanic_domain:       "6 hazard zones in hexagonal pattern.",
  wrath_of_sea:         "Ultimate: 3 expanding rings + pull + massive hazard.",

  // --- Earth-205 Floor 1: Scrapyard District ---
  pipe_swipe:              "Cone telegraph → damage in 60° arc. Range 80.",
  slingshot_snipe:         "1s delay → fast projectile (speed 12). Dmg 30.",
  ankle_bite:              "Dash toward player → apply bleed 3s. Dmg 18.",
  hairspray_flamethrower:  "2s channeled cone DoT. 45° arc, range 120. Applies mark.",
  frenzied_slash:          "3-hit combo over 1s. Final hit stuns 0.5s.",
  pneumatic_shot:          "Fast projectile → root 1s on hit. Dmg 22.",
  glass_flurry:            "Zig-zag dash (3 direction changes) → slash at end.",
  earthquake_slam_e205:    "0.8s telegraph circle → AoE 100px + knockback. Dmg 35.",
  // Willis boss
  jury_rigged_taser:       "Projectile → stun 1s. Dmg 30.",
  chemical_flask:          "Lob to player pos → poison puddle 80px, 5s.",
  caltrop_scatter:         "5 caltrops around self. Slow + 10 dmg if walked on.",
  decoy_device:            "Spawn decoy mob (1hp, runs away). 5s duration.",
  calculated_dodge:        "Reactive: 30% chance dash + brief invuln when hit.",
  makeshift_emp:           "AoE 120px → silence 2s. Dmg 25.",
  master_plan:             "Spawns 3 decoys + caltrops + chemical flask at once.",
  // Puppedrill boss
  crowbar_hook:            "Pull player 100px toward self. Dmg 25.",
  shattering_swing:        "Wide 120° arc range 90. Dmg 40 + knockback.",
  scrap_metal_toss:        "3 projectiles in spread. Dmg 20 each.",
  adrenaline_sprint:       "Speed x2 for 3s.",
  kneecap_sweep:           "Circle 70px → mobility_lock 2s. Dmg 30.",
  brutal_beatdown:         "5-hit combo over 2s. Each 30 dmg. Final knockback.",

  // --- Earth-205 Floor 2: Butcher Row ---
  boomerang_cleave:        "Projectile out 200px then returns. Dmg 20 each way.",
  chain_whip:              "Line attack 150px → silence 1s. Dmg 22.",
  flare_trap:              "Lob → fire hazard zone 80px radius, 5s, 6 dmg/tick.",
  guillotine_drop:         "1.2s telegraph → 50 dmg in 60px. Self-stun on miss.",
  suppressive_burst:       "3-round burst (15° spread) → slow 1s each. Dmg 15.",
  kick_and_clear:          "Dash stun → then 3 shotgun pellets. Dmg 15 + 10 each.",
  laser_designation:       "1.5s telegraph line → heavy shot. Dmg 40.",
  bouncing_blast:          "Grenade bounces off walls 2x. Dmg 30, radius 80.",
  // Sackhead boss
  barbed_swing:            "90° arc → bleed 3s. Dmg 35.",
  skull_cracker:           "Overhead slam → stun 1s. Dmg 45.",
  bull_charge:             "Charge 250px → dmg 40 + knockback.",
  stranglehold:            "Grab → DoT 10/0.5s for 2s. Root player.",
  batter_up:               "180° swing → knockback + stun 1.5s. Dmg 60.",
  // Mr. Schwallie boss
  cigar_flick:             "Projectile → fire zone 60px, 3s. Dmg 15 + 6/tick.",
  cqc_counter:             "Counter stance 2s. Negates melee + counter 35 dmg.",
  akimbo_barrage:          "6 bullets in 180° spread. Dmg 18 each.",
  tactical_slide:          "Slide 150px perpendicular. Brief invuln.",
  flashbang_breach:        "Projectile → blind (flash) 1.5s. AoE 100px. Dmg 20.",
  one_man_army:            "Slide + akimbo + flashbang in quick succession.",

  // --- Earth-205 Floor 3: Carnival of Decay ---
  pin_cascade:             "3 bouncing pin projectiles → AoE on final land.",
  static_poodle:           "Spawn barrier mob (60hp). On destroy: AoE + slow 2s.",
  stone_ambush:            "Wait motionless → leap 200px + knockback. Dmg 35.",
  smoke_and_mirrors:       "On-hit teleport 150px + spawn smoke cloud.",
  rigging_drop:            "Telegraph at player pos → 1s delay drop. Dmg 30 + stun.",
  soprano_shriek:          "Cone 90° range 140 through walls → confuse 2s. Dmg 15.",
  prop_toss:               "3 projectiles in spread (random speeds). Dmg 14 each.",
  pirouette_dash:          "Dash through player + reflect 1 projectile. Dmg 20.",
  // Killer Mime boss
  finger_gun:              "Invisible projectile. Dmg 30.",
  invisible_wall:          "Create barrier (blocks movement 4s, 100hp).",
  heavy_mallet:            "Overhead slam → stun 1s + knockback. Dmg 40.",
  tug_of_war:              "Pull player 120px toward self. Root 1s.",
  trapped_in_box:          "4 walls around player (40hp each). 3s duration.",
  // Major Phantom boss
  overture_slash:          "3-slash combo (each 120° arc). Dmg 20 each.",
  stage_blood:             "Mark player → 2s delay AoE at marked pos. Dmg 45.",
  theatrical_parry:        "Counter stance 2s. Counter dmg 40.",
  phantom_step:            "Teleport behind player + backstab. Dmg 35.",
  grand_finale:            "Teleport to center → massive 360° expanding AoE. Dmg 55.",

  // --- Earth-205 Floor 4: Casino Noir ---
  baton_sweep:             "Cone 90° range 80 → mobility_lock 2s. Dmg 22.",
  tripwire_drop_e205:      "Dash away + drop root trap at old position. Root 1.5s.",
  auto_turret:             "Deploy turret (fires every 1.5s for 8s). Dmg 12.",
  flash_and_fade:          "Flash blind 0.5s → smoke zone 100px, 4s.",
  knee_capper:             "Sweep 70px → heavy slow (0.4x) 2.5s. Dmg 20.",
  hustle_step:             "Zig-zag speed buff 2s (1.5x). Contact dmg 18.",
  spray_and_pray:          "3s channeled bullet cone (60°). Dmg 8/bullet.",
  execution_shot:          "2s lock-on → massive single shot. Dmg 55.",
  // Lady Red boss
  concealed_stiletto:      "Quick stab → bleed 3s. Dmg 30.",
  suppressed_fire:         "3-round burst, low spread. Dmg 20 each.",
  toxic_perfume:           "AoE 100px → confuse 2s + poison 3s. Dmg 10.",
  red_herring:             "Dash away + leave decoy (1hp). 4s duration.",
  checkmate:               "Dash behind → 5 stiletto hits (15 each) → poison 4s.",
  // The Boss boss
  gold_ring_hook:          "Hook projectile → pull player 100px. Dmg 25.",
  saturday_night_shuffle:  "Zig-zag dash through player. Contact dmg 30.",
  call_the_goons:          "Spawn 2 tracksuit_goon mobs. Max 4 active.",
  dirty_money:             "Gold decoys that explode → dmg 25 + slow 2s.",
  the_hit:                 "2s lock-on → teleport behind → execution strike. Dmg 70.",

  // --- Earth-205 Floor 5: Meltdown Labs ---
  acid_splash:             "Slow blob → poison puddle 60px, 4s, 5 dmg/tick.",
  crop_dust:               "Fly over player → toxic trail 40px, 3s, 6 dmg/tick.",
  volatile_reaction:       "Lob potion projectile. Dmg 20. Death explosion.",
  fume_slam:               "Circle AoE 90px → confuse 1.5s. Dmg 28.",
  sticky_trail:            "While moving, drops slow zones (0.5x, 3s).",
  rad_burst:               "Reactive: pulse AoE 70px when damaged. Dmg 15 + poison.",
  stasis_beam:             "Sweep beam 180° → mobility_lock 2s. Dmg 18.",
  feral_leap:              "Jump to player → stun 0.8s on land. Dmg 25.",
  // Lady Elixir boss
  toxic_stream:            "Line projectile + poison trail. Dmg 20.",
  corrosive_puddle:        "Puddle at player pos 90px, 5s. Mark on contact.",
  volatile_flask_boss:     "Lob flask → AoE 80px. Random: poison, slow, or confuse.",
  stim_valve:              "Self-heal 10% + speed boost 3s.",
  maximum_overpressure:    "2s channel → 200px AoE. Dmg 65 + poison 5s.",
  // Nofaux boss
  caustic_cleave:          "120° arc → poison 3s. Dmg 35.",
  viscous_sludge:          "Projectile → slow zone 80px (0.4x, 4s). Dmg 20.",
  reactive_gel_shield:     "Shield absorbs 200 dmg. AoE 80px on break.",
  hazard_spill:            "3 poison puddles around player (70px each, 5s).",
  bio_grapple:             "Pull → root 1.5s + poison. Dmg 25.",
  critical_meltdown:       "Below 25% hp: 3s channel → 250px AoE. Dmg 80 + poison.",

  // --- Wagashi Floor 1: Silk Nest / Boar Territory ---
  snap_web:                "Web projectile. Applies slow on hit.",
  silk_needle_fan:         "3 silk spike projectiles in spread pattern.",
  brood_glow:              "Pulse buffs nearby mob speed +30% for 3s.",
  wrap_tomb:               "Delayed circle under player. Root if still inside.",
  metal_skull_bash:        "Short charge forward. Knockback on hit.",
  dust_rush:               "Dash to player. Leaves dust cloud at start.",
  armor_brace:             "Self-heal 30% max HP.",
  battle_beat:             "Drum pulse buffs nearby mob damage +30% for 3s.",
  // Sichou (Spider mini-boss)
  silk_snare:              "Places 3 web patches near player. Root on contact.",
  thread_shot:             "Silk projectile. Slow 2s on hit.",
  brood_call:              "Summons 2-3 spiderling minions.",
  // Tongya (Boar boss)
  titan_charge:            "Long charge across room. Knockback on hit.",
  war_stomp:               "Circular shockwave around self. Radius 150.",
  boar_fury:               "Self-buff: +50% speed, faster ability rotation.",

  // --- Wagashi Floor 2: Jade Temple / Ruined Sanctum ---
  venom_arc:               "Poison cone attack. Applies poison DoT.",
  jade_flash:              "Green eye flare cone. Slows players hit.",
  snake_call:              "Summons a serpent minion.",
  petrify_glint:           "Marks player. Stuns after delay if in LOS.",
  rubble_toss:             "Throws debris at player position.",
  ground_split:            "Shock line forward. Multi-point damage.",
  stone_ward:              "Heals nearby allies 10% max HP.",
  aftershock_ring:         "Ground strike → delayed expanding shockwave.",
  // Jade Serpent (mini-boss)
  jade_glare:              "Narrow beam. Stuns on hit.",
  serpent_swarm:            "Summons 3 snake minions.",
  jade_spires:             "Line of jade spikes erupt from ground.",
  // Stone Golem Guardian (boss)
  earthbreaker_slam:       "Circular AoE slam. Radius 160.",
  boulder_hurl:            "Large stone projectile at range.",
  stonehide:               "Self-heal 25% max HP.",

  // --- Wagashi Floor 3: Storm Palace / Inferno Bastion ---
  static_lunge:            "Lightning spear dash. Stun on hit.",
  charged_burst_arrow:     "Electrified arrow with AoE splash on impact.",
  wave_cut:                "Water slash projectile. Speed 9.",
  lightning_seal:          "Marks tile. Lightning strikes after delay. Stun.",
  cinder_step:             "Short dash + lingering fire zone at end.",
  coal_breath:             "Short flame cone. 50° arc.",
  war_ember_chant:         "Buffs nearby mob damage +30% for 3s.",
  magma_breaker:           "Fire eruption line forward. 5 hit points.",
  // Azure Dragon (mini-boss)
  lightning_mark:          "2-3 lightning strike zones near player. Stun.",
  tidal_wave:              "Water projectile. Pushes player back 60px.",
  cyclone_guard:           "Storm aura around self. Periodic damage in 120px.",
  // Jaja (Oni boss)
  inferno_crash:           "Circular fire burst. Radius 160.",
  blazing_advance:         "Rush forward leaving fire trail zones.",
  ember_mantle:            "Heat aura. Periodic damage to nearby players.",

  // --- Wagashi Floor 4: Execution Grounds / Void Sanctum ---
  draw_cut:                "Fast burst line slash. 25-frame telegraph.",
  afterimage_dash:         "Dash through player leaving afterimage.",
  blood_seal_shot:         "Talisman arrow. Delayed burst at landing.",
  judgment_drop:           "Overhead slam with forward shockwave line.",
  dust_pop:                "Teleport + void burst at departure point.",
  mirror_split:            "Creates decoy. Fires from random position.",
  gravity_press:           "Slow zone at player position. Lasts 3s.",
  rift_leap:               "Invisible blink pounce to player.",
  // Gensai (Executioner mini-boss)
  shadow_step:             "Blink behind player + slash.",
  blood_crescent:          "Fast blade-wave projectile.",
  demon_cleaver:           "Charged 90° cone slash. Heavy damage.",
  // Moon Rabbit (boss)
  gravity_well:            "Pull field. Drags player inward + damage.",
  moon_rift_orb:           "Slow orb. Explodes in 80px radius.",
  phase_skip:              "Disappear + reappear. Burst at both points.",

  // --- Wagashi Floor 5: Devouring Maw / Unsealed Heaven ---
  mire_spit:               "Spit projectile. Applies slow on hit.",
  dread_belch:             "Cone breath attack. 60° arc.",
  maw_hymn:                "Debuff aura. Slows nearby players.",
  dark_gulp:               "Cone pull toward self + damage.",
  shard_toss:              "Fast ranged projectile. Speed 11.",
  minor_orb_pulse:         "Orb burst around self. Radius 120.",
  thunder_tail_crash:      "Ground slam line. 4 hit points.",
  seal_rupture:            "AoE shockwave. Radius 150 + stun.",
  // Celestial Toad (mini-boss)
  devouring_pull:          "Channeled suction field. Pulls player in.",
  void_spit:               "5 dark projectiles in spread pattern.",
  corruption_mire:         "3 corrupted ground pools. Damage over time.",
  // Lord Sarugami (FINAL BOSS)
  black_orb_sentinels:     "5 orbiting spheres. Guard and damage nearby players.",
  orb_bomb_command:        "3 orbs travel to positions and explode.",
  divine_form_shift:       "HP-triggered phase shift: Titan → Statue → Primal.",
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
  },
  vortalis: {
    name: 'Vortalis',
    floors: {
      1: { name: 'Floor 1 — Pirate Shores / Naval Fleet', mobs: ['bilge_rat', 'powder_keg', 'deckhand_shooter', 'anchor_hauler', 'captain_husa', 'ironclad_marine', 'tidecaller_mystic', 'galleon_sniper', 'sunken_dreadnought', 'admiral_von_kael'] },
      2: { name: 'Floor 2 — Jungle / Blood Cove', mobs: ['jungle_headhunter', 'voodoo_creeper', 'canopy_sniper', 'temple_silverback', 'zongo', 'crimson_corsair', 'crystal_cultist', 'bone_clad_brute', 'sanguine_siren', 'bloodborne_marlon'] },
      3: { name: 'Floor 3 — Moonlit Docks / Ghost Ship', mobs: ['feral_deckhand', 'howling_lookout', 'sea_dog_brute', 'rabid_wharf_hound', 'wolfbeard', 'phantom_swashbuckler', 'poltergeist_gunner', 'drowned_banshee', 'cursed_shackler', 'ghostbeard'] },
      4: { name: 'Floor 4 — Sunken Reef / Abyssal Trench', mobs: ['ink_spitter', 'coral_crusher', 'trench_tentacle', 'barnacle_bomber', 'kraken_jim', 'gilded_triton', 'coin_spitter_jelly', 'deep_sea_dredger', 'royal_cephalopod', 'king_requill'] },
      5: { name: 'Floor 5 — Coral Throne / Ocean Temple', mobs: ['alabaster_sentinel', 'reef_weaver', 'gilded_manta', 'royal_shell_knight', 'queen_siralyth', 'sea_serpent_spawn', 'living_whirlpool', 'bone_tooth_zealot', 'tidal_avatar', 'mami_wata'] },
    }
  },
  dungeon_4: {
    name: 'Earth-205',
    floors: {
      1: { name: 'Floor 1 — Scrapyard District', mobs: ['scrap_metal_scrounger', 'alleyway_lookout', 'junkyard_hound', 'aerosol_pyro', 'willis', 'patchwork_thug', 'nail_gunner', 'adrenaline_fiend', 'sledgehammer_brute', 'puppedrill'] },
      2: { name: 'Floor 2 — Butcher Row', mobs: ['butcher_block_maniac', 'chain_gang_brawler', 'arsonist', 'executioner_bruiser', 'sackhead', 'syndicate_enforcer', 'breacher_unit', 'tactical_spotter', 'riot_juggernaut', 'mr_schwallie'] },
      3: { name: 'Floor 3 — Carnival of Decay', mobs: ['juggling_jester', 'balloon_twister', 'human_statue', 'illusionist', 'killer_mime', 'stagehand_brute', 'phantom_chorus', 'prop_master', 'macabre_dancer', 'major_phantom'] },
      4: { name: 'Floor 4 — Casino Noir', mobs: ['casino_pit_boss', 'laser_grid_thief', 'vault_hacker', 'smokescreen_smuggler', 'lady_red', 'tracksuit_goon', 'disco_brawler', 'tommy_gun_heavy', 'the_cleaner', 'the_boss_e205'] },
      5: { name: 'Floor 5 — Meltdown Labs', mobs: ['hazmat_grunt', 'sprayer_drone', 'mad_assistant', 'chem_brute', 'lady_elixir', 'sludge_crawler', 'irradiated_walker', 'lockdown_sentinel', 'failed_specimen', 'nofaux'] },
    }
  },
  dungeon_5: {
    name: 'Wagashi',
    floors: {
      1: { name: 'Floor 1 — Silk Nest / Boar Territory', mobs: ['silk_skitterer', 'needleback_weaver', 'brood_lantern_mite', 'silk_coffin_widow', 'sichou', 'copperhide_hoglet', 'tusk_raider', 'bronzeback_crusher', 'warboar_drummer', 'tongya'] },
      2: { name: 'Floor 2 — Jade Temple / Ruined Sanctum', mobs: ['temple_fang_acolyte', 'jade_idol_watcher', 'coil_priestess', 'jade_vein_stalker', 'jade_serpent', 'rubblebound_sentinel', 'pillarbreaker_brute', 'dustcore_totem', 'mausoleum_warden', 'stone_golem_guardian'] },
      3: { name: 'Floor 3 — Storm Palace / Inferno Bastion', mobs: ['tempest_spearman', 'cloudscale_archer', 'tideblade_disciple', 'thunder_crest_knight', 'azure_dragon', 'ember_guard', 'furnace_hound', 'ashen_banner_monk', 'crimson_furnace_captain', 'jaja'] },
      4: { name: 'Floor 4 — Execution Grounds / Void Sanctum', mobs: ['ashen_blade_retainer', 'lantern_veil_assassin', 'blood_script_archer', 'crimson_gate_executioner', 'gensai', 'lunar_dust_hare', 'crescent_mirror_wisp', 'gravity_ear_monk', 'eclipse_burrower', 'moon_rabbit'] },
      5: { name: 'Floor 5 — Devouring Maw / Unsealed Heaven', mobs: ['miregulp_tadpole', 'gulchspine_bloater', 'hymn_eater_toadlet', 'abyssal_swallower', 'celestial_toad', 'shrine_shard_monkey', 'seal_fragment_sprite', 'thundertail_ape', 'heavens_gate_breaker', 'lord_sarugami'] },
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
