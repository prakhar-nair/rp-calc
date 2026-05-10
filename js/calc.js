// ============================================================
// DAMAGE CALCULATOR - Gen 4 (Renegade Platinum) mechanics
// ============================================================

const IRON_FIST_MOVES = new Set([
  'Fire Punch','Thunder Punch','Ice Punch','Drain Punch','Mach Punch',
  'Shadow Punch','Bullet Punch',
]);

const RECKLESS_MOVES = new Set([
  'Brave Bird','Double-Edge','Flare Blitz','Head Smash','Submission',
  'Volt Tackle','Wild Charge','Wood Hammer',
]);

const BLAZE_ABILITY_MAP = {
  Blaze:'Fire', Torrent:'Water', Overgrow:'Grass', Swarm:'Bug',
};

function calcStat(base, iv, ev, level, natureMult, isHP) {
  if (isHP) {
    return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
  }
  return Math.floor((Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5) * natureMult);
}

function getStats(pokemon) {
  const data = POKEMON_DATA[pokemon.name];
  if (!data) return null;
  const [bHp, bAtk, bDef, bSpa, bSpd, bSpe] = data;
  const n = NATURES[pokemon.nature] || NATURES['Hardy'];
  const iv = pokemon.ivs;
  const ev = pokemon.evs;
  const lv = pokemon.level;
  return {
    hp:  calcStat(bHp,  iv.hp,  ev.hp,  lv, 1,     true),
    atk: calcStat(bAtk, iv.atk, ev.atk, lv, n.atk, false),
    def: calcStat(bDef, iv.def, ev.def, lv, n.def, false),
    spa: calcStat(bSpa, iv.spa, ev.spa, lv, n.spa, false),
    spd: calcStat(bSpd, iv.spd, ev.spd, lv, n.spd, false),
    spe: calcStat(bSpe, iv.spe, ev.spe, lv, n.spe, false),
  };
}

function getTypeEffectiveness(moveType, defenderTypes) {
  let mult = 1;
  for (const dt of defenderTypes) {
    if (!dt) continue;
    const row = TYPE_CHART[moveType];
    if (row && row[dt] !== undefined) mult *= row[dt];
  }
  return mult;
}

function hasSTAB(moveType, attackerTypes) {
  return attackerTypes.includes(moveType);
}

function getWeatherMod(weather, moveType) {
  if (weather === 'Sun' || weather === 'Harsh Sunshine') {
    if (moveType === 'Fire') return 1.5;
    if (moveType === 'Water') return 0.5;
  }
  if (weather === 'Rain' || weather === 'Heavy Rain') {
    if (moveType === 'Water') return 1.5;
    if (moveType === 'Fire') return 0.5;
  }
  return 1.0;
}

function getTerrainMod(terrain, moveType) {
  if (terrain === 'Electric' && moveType === 'Electric') return 1.3;
  if (terrain === 'Grassy'   && moveType === 'Grass')    return 1.3;
  if (terrain === 'Misty'    && moveType === 'Dragon')   return 0.5;
  if (terrain === 'Psychic'  && moveType === 'Psychic')  return 1.3;
  return 1.0;
}

function getSandSpDMod(weather, defenderTypes) {
  if (weather === 'Sand' && defenderTypes.includes('Rock')) return 1.5;
  return 1.0;
}

function calcStealthRockDamage(defenderTypes) {
  const eff = getTypeEffectiveness('Rock', defenderTypes);
  const fractions = { 0.25: 1/32, 0.5: 1/16, 1: 1/8, 2: 1/4, 4: 1/2 };
  return fractions[eff] || 1/8;
}

function calcSpikesDamage(layers, defenderTypes) {
  if (!layers || defenderTypes.includes('Flying')) return 0;
  const fracs = [0, 1/8, 1/6, 1/4];
  return fracs[Math.min(layers, 3)] || 0;
}

function getBurnMod(status, category) {
  return (status === 'Burned' && category === 'P') ? 0.5 : 1.0;
}

function getParaSpeedMod(status) {
  return status === 'Paralyzed' ? 0.25 : 1.0;
}

// options supported:
//   attackerAbility, defenderAbility
//   attackerItem, attackerStatus
//   atkStage, defStage          — pre-resolved to the correct stat's stage
//   weather, terrain
//   reflect, lightScreen, auroraVeil
//   helpingHand                 — 1.5× boost on attacker's move
//   crit, hitCount
//   doubles                     — spread damage −25%
//   switching                   — defender is switching out (Pursuit 2× power)
//   powerTrickAtk / powerTrickDef
//   flowerGiftAtk / flowerGiftDef
//   flashFireActive             — attacker's Flash Fire triggered (1.5× Fire)
//   atkLowHP                    — attacker HP ≤ 1/3 (triggers Blaze/Torrent/Overgrow/Swarm)
//   defCurrentHP, defStatus
function calcDamageRolls(attacker, atkStats, moveKey, defenderMon, defStats, options = {}) {
  const moveData = MOVES[moveKey];
  if (!moveData) return null;

  let [basePower, moveType, category] = moveData;
  const origBP = basePower; // original BP for Technician check

  if (category === 'X') return null;
  if (basePower <= 0) return null;

  // Pursuit doubles power when target is switching out
  if (moveKey === 'Pursuit' && options.switching) basePower *= 2;

  const isPhysical = category === 'P';

  // Power Trick: swap the Atk and Def stat values
  let effAtk = atkStats;
  if (options.powerTrickAtk) effAtk = { ...atkStats, atk: atkStats.def, def: atkStats.atk };
  let effDef = defStats;
  if (options.powerTrickDef) effDef = { ...defStats, atk: defStats.def, def: defStats.atk };

  const defData  = POKEMON_DATA[defenderMon.name];
  const atkData  = POKEMON_DATA[attacker.name];
  const defTypes = defData ? [defData[6], defData[7]].filter(Boolean) : [];
  const atkTypes = atkData ? [atkData[6], atkData[7]].filter(Boolean) : [];

  const atkAbility = options.attackerAbility || '';
  const defAbility = options.defenderAbility || '';

  // === Defender ability immunities (override type chart) ===
  if (defAbility === 'Levitate' && moveType === 'Ground')
    return { immune: true, effectiveness: 0 };
  if ((defAbility === 'Water Absorb' || defAbility === 'Storm Drain' || defAbility === 'Dry Skin') && moveType === 'Water')
    return { immune: true, effectiveness: 0 };
  if ((defAbility === 'Volt Absorb' || defAbility === 'Lightning Rod' || defAbility === 'Motor Drive') && moveType === 'Electric')
    return { immune: true, effectiveness: 0 };
  if (defAbility === 'Flash Fire' && moveType === 'Fire')
    return { immune: true, effectiveness: 0 };
  if (defAbility === 'Sap Sipper' && moveType === 'Grass')
    return { immune: true, effectiveness: 0 };

  const typeEff = getTypeEffectiveness(moveType, defTypes);
  if (typeEff === 0) return { immune: true, effectiveness: 0 };

  // Wonder Guard: only super effective hits work
  if (defAbility === 'Wonder Guard' && typeEff <= 1)
    return { immune: true, effectiveness: typeEff };

  // === Attacker stat ===
  let atkStat = isPhysical ? effAtk.atk : effAtk.spa;

  // Item boosts on attack stat
  if (options.attackerItem === 'Choice Band'  && isPhysical)  atkStat = Math.floor(atkStat * 1.5);
  if (options.attackerItem === 'Choice Specs' && !isPhysical) atkStat = Math.floor(atkStat * 1.5);

  // Flower Gift: +50% Atk in sun (physical only)
  const inSun = options.weather === 'Sun' || options.weather === 'Harsh Sunshine';
  if (options.flowerGiftAtk && inSun && isPhysical) atkStat = Math.floor(atkStat * 1.5);

  // Guts: 1.5× Atk when statused, negates burn penalty
  const isStatused = ['Burned','Poisoned','Badly Poisoned','Paralyzed','Asleep','Frozen'].includes(options.attackerStatus || '');
  if (atkAbility === 'Guts' && isStatused && isPhysical) {
    atkStat = Math.floor(atkStat * 1.5); // no burn halving applied
  } else {
    atkStat = Math.floor(atkStat * getBurnMod(options.attackerStatus || 'Healthy', category));
  }

  // Pure Power / Huge Power: 2× Atk (physical)
  if ((atkAbility === 'Pure Power' || atkAbility === 'Huge Power') && isPhysical) {
    atkStat = atkStat * 2;
  }

  // Hustle: 1.5× Atk (physical)
  if (atkAbility === 'Hustle' && isPhysical) {
    atkStat = Math.floor(atkStat * 1.5);
  }

  // Solar Power: 1.5× SpA in Sun
  if (atkAbility === 'Solar Power' && inSun && !isPhysical) {
    atkStat = Math.floor(atkStat * 1.5);
  }

  // Stat stages (caller resolves correct stat's stage before passing)
  const atkStage = options.atkStage || 0;
  const defStage = options.defStage || 0;
  const atkMult  = atkStage >= 0 ? (2 + atkStage) / 2 : 2 / (2 - atkStage);
  const defMult  = defStage >= 0 ? (2 + defStage) / 2 : 2 / (2 - defStage);
  const atkStatMod = Math.floor(atkStat * atkMult);

  // === Defender stat ===
  let defStatBase = isPhysical ? effDef.def : effDef.spd;
  if (!isPhysical) defStatBase = Math.floor(defStatBase * getSandSpDMod(options.weather || 'None', defTypes));

  // Flower Gift: +50% SpD in sun (special only)
  if (options.flowerGiftDef && inSun && !isPhysical) defStatBase = Math.floor(defStatBase * 1.5);

  // Marvel Scale: 1.5× Def when statused
  const defIsStatused = ['Burned','Poisoned','Badly Poisoned','Paralyzed','Asleep','Frozen'].includes(options.defStatus || '');
  if (defAbility === 'Marvel Scale' && defIsStatused && isPhysical) {
    defStatBase = Math.floor(defStatBase * 1.5);
  }

  const defStatFinal = Math.floor(defStatBase * defMult);

  // === Base power modifications ===
  // Facade: 140 BP when attacker is statused
  if (moveKey === 'Facade' && isStatused) basePower = 140;

  // Venoshock: 130 BP when target is poisoned
  if (moveKey === 'Venoshock' && (options.defStatus === 'Poisoned' || options.defStatus === 'Badly Poisoned')) {
    basePower = 130;
  }

  // Technician: 1.5× for moves with original BP ≤ 60
  if (atkAbility === 'Technician' && origBP > 0 && origBP <= 60) {
    basePower = Math.floor(basePower * 1.5);
  }

  // Iron Fist: 1.2× for punching moves
  if (atkAbility === 'Iron Fist' && IRON_FIST_MOVES.has(moveKey)) {
    basePower = Math.floor(basePower * 1.2);
  }

  // Reckless: 1.2× for recoil moves
  if (atkAbility === 'Reckless' && RECKLESS_MOVES.has(moveKey)) {
    basePower = Math.floor(basePower * 1.2);
  }

  // Blaze / Torrent / Overgrow / Swarm: 1.5× when HP ≤ 1/3
  const blazeType = BLAZE_ABILITY_MAP[atkAbility];
  if (blazeType && options.atkLowHP && moveType === blazeType) {
    basePower = Math.floor(basePower * 1.5);
  }

  // Flash Fire (activated): 1.5× Fire
  if (atkAbility === 'Flash Fire' && options.flashFireActive && moveType === 'Fire') {
    basePower = Math.floor(basePower * 1.5);
  }

  // Sand Force: 1.3× Rock/Steel/Ground in Sand
  if (atkAbility === 'Sand Force' && options.weather === 'Sand' &&
      (moveType === 'Rock' || moveType === 'Steel' || moveType === 'Ground')) {
    basePower = Math.floor(basePower * 1.3);
  }

  // === Base damage formula ===
  const level = attacker.level;
  const base = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * basePower * atkStatMod / defStatFinal) / 50) + 2;

  const typeEff2 = typeEff; // alias for clarity in return
  const stab       = hasSTAB(moveType, atkTypes) ? (atkAbility === 'Adaptability' ? 2.0 : 1.5) : 1.0;
  const weatherMod = getWeatherMod(options.weather || 'None', moveType);
  const terrainMod = getTerrainMod(options.terrain || 'None', moveType);

  // Item damage modifiers
  let itemMod = 1.0;
  if (options.attackerItem === 'Life Orb')                    itemMod = 1.3;
  if (options.attackerItem === 'Expert Belt' && typeEff > 1)  itemMod = 1.2;
  if (options.attackerItem === 'Muscle Band'  && isPhysical)  itemMod = 1.1;
  if (options.attackerItem === 'Wise Glasses' && !isPhysical) itemMod = 1.1;

  // Screens
  let screenMod = 1.0;
  if (options.reflect     && isPhysical)  screenMod *= 0.5;
  if (options.lightScreen && !isPhysical) screenMod *= 0.5;
  if (options.auroraVeil)                 screenMod *= 0.5;

  const helpingHandMod = options.helpingHand ? 1.5 : 1.0;
  // Sniper: crits deal 3× instead of 2×
  const critMod = options.crit ? (atkAbility === 'Sniper' ? 3.0 : 2.0) : 1.0;
  const hitCount = Math.max(1, parseInt(options.hitCount) || 1);
  const spreadMod = options.doubles ? 0.75 : 1.0;

  // === Ability-based final damage modifiers ===
  let abilityAtkMod = 1.0;
  let abilityDefMod = 1.0;

  // Tinted Lens: 2× for not-very-effective moves
  if (atkAbility === 'Tinted Lens' && typeEff < 1) abilityAtkMod *= 2.0;

  // Filter / Solid Rock: 0.75× for super effective
  if ((defAbility === 'Filter' || defAbility === 'Solid Rock') && typeEff > 1) abilityDefMod *= 0.75;

  // Thick Fat: 0.5× Fire and Ice
  if (defAbility === 'Thick Fat' && (moveType === 'Fire' || moveType === 'Ice')) abilityDefMod *= 0.5;

  // Heatproof: 0.5× Fire
  if (defAbility === 'Heatproof' && moveType === 'Fire') abilityDefMod *= 0.5;

  // Dry Skin: 1.25× Fire (Water immunity already handled above)
  if (defAbility === 'Dry Skin' && moveType === 'Fire') abilityDefMod *= 1.25;

  // Multiscale / Shadow Shield: 0.5× at full HP
  const defHP     = defStats.hp;
  const currentHP = (options.defCurrentHP != null && options.defCurrentHP > 0)
    ? options.defCurrentHP : defHP;
  if ((defAbility === 'Multiscale' || defAbility === 'Shadow Shield') &&
      (options.defCurrentHP == null || options.defCurrentHP >= defHP)) {
    abilityDefMod *= 0.5;
  }

  // 16 random rolls (85–100)
  const rolls = [];
  for (let i = 0; i <= 15; i++) {
    let dmg = base;
    dmg = Math.floor(dmg * stab);
    if      (typeEff === 0.25) dmg = Math.floor(dmg * 0.25);
    else if (typeEff === 0.5)  dmg = Math.floor(dmg * 0.5);
    else if (typeEff === 2)    dmg = dmg * 2;
    else if (typeEff === 4)    dmg = dmg * 4;
    dmg = Math.floor(dmg * weatherMod);
    dmg = Math.floor(dmg * terrainMod);
    dmg = Math.floor(dmg * spreadMod);
    dmg = Math.floor(dmg * itemMod);
    dmg = Math.floor(dmg * screenMod);
    dmg = Math.floor(dmg * helpingHandMod);
    dmg = Math.floor(dmg * critMod);
    dmg = Math.floor(dmg * abilityAtkMod);
    dmg = Math.floor(dmg * abilityDefMod);
    dmg = Math.floor(dmg * (85 + i) / 100);
    dmg = Math.max(1, dmg) * hitCount;
    rolls.push(dmg);
  }

  const min = rolls[0];
  const max = rolls[15];

  return {
    immune: false,
    effectiveness: typeEff,
    moveType, category, basePower,
    stab: stab > 1,
    weatherBoosted: weatherMod > 1,
    weatherReduced: weatherMod < 1,
    terrainBoosted: terrainMod > 1,
    terrainReduced: terrainMod < 1,
    hitCount,
    min, max,
    defHP, currentHP,
    minPct:     min / defHP * 100,
    maxPct:     max / defHP * 100,
    minCurPct:  min / currentHP * 100,
    maxCurPct:  max / currentHP * 100,
    rolls,
    ohko:           min >= currentHP,
    twoHko:         min * 2 >= currentHP,
    threeHko:       min * 3 >= currentHP,
    possibleOhko:   max >= currentHP && min < currentHP,
    possibleTwoHko: max * 2 >= currentHP && min * 2 < currentHP,
  };
}

function getKoLabel(result) {
  if (!result || result.immune) return '';
  if (result.ohko)           return 'OHKO';
  if (result.possibleOhko)   return 'Possible OHKO';
  if (result.twoHko)         return '2HKO';
  if (result.possibleTwoHko) return 'Possible 2HKO';
  if (result.threeHko)       return '3HKO';
  return '';
}

function getEffectivenessLabel(eff) {
  if (eff === 0)    return 'Immune';
  if (eff === 0.25) return '¼×';
  if (eff === 0.5)  return '½×';
  if (eff === 1)    return '1×';
  if (eff === 2)    return '2×';
  if (eff === 4)    return '4×';
  return `${eff}×`;
}

function compareSpeed(atkStats, defStats, options = {}) {
  let atkSpe = atkStats.spe;
  let defSpe = defStats.spe;

  const atkAbility = options.attackerAbility || '';
  const defAbility = options.defenderAbility || '';

  // Paralysis — Quick Feet negates it instead of being penalised
  if (options.attackerStatus === 'Paralyzed') {
    if (atkAbility !== 'Quick Feet') atkSpe = Math.floor(atkSpe * 0.25);
  }
  if (options.defStatus === 'Paralyzed') {
    if (defAbility !== 'Quick Feet') defSpe = Math.floor(defSpe * 0.25);
  }

  if (options.tailwindAtk) atkSpe *= 2;
  if (options.tailwindDef) defSpe *= 2;

  const aSpeStage = options.atkSpeStage || 0;
  const dSpeStage = options.defSpeStage || 0;
  const aSpeMult  = aSpeStage >= 0 ? (2 + aSpeStage) / 2 : 2 / (2 - aSpeStage);
  const dSpeMult  = dSpeStage >= 0 ? (2 + dSpeStage) / 2 : 2 / (2 - dSpeStage);
  atkSpe = Math.floor(atkSpe * aSpeMult);
  defSpe = Math.floor(defSpe * dSpeMult);

  // Weather-based speed doubling
  const weather = options.weather || 'None';
  if (atkAbility === 'Chlorophyll' && (weather === 'Sun' || weather === 'Harsh Sunshine')) atkSpe *= 2;
  if (atkAbility === 'Swift Swim'  && (weather === 'Rain' || weather === 'Heavy Rain'))    atkSpe *= 2;
  if (atkAbility === 'Sand Rush'   && weather === 'Sand') atkSpe *= 2;
  if (defAbility === 'Chlorophyll' && (weather === 'Sun' || weather === 'Harsh Sunshine')) defSpe *= 2;
  if (defAbility === 'Swift Swim'  && (weather === 'Rain' || weather === 'Heavy Rain'))    defSpe *= 2;
  if (defAbility === 'Sand Rush'   && weather === 'Sand') defSpe *= 2;

  // Quick Feet: 1.5× when statused (paralysis already not penalised above)
  const atkStatused = options.attackerStatus && options.attackerStatus !== 'Healthy';
  const defStatused = options.defStatus      && options.defStatus      !== 'Healthy';
  if (atkAbility === 'Quick Feet' && atkStatused) atkSpe = Math.floor(atkSpe * 1.5);
  if (defAbility === 'Quick Feet' && defStatused) defSpe = Math.floor(defSpe * 1.5);

  return { atkSpe, defSpe, faster: atkSpe > defSpe ? 'atk' : atkSpe < defSpe ? 'def' : 'tie' };
}
