// ============================================================
// DAMAGE CALCULATOR - Gen 4 (Renegade Platinum) mechanics
// ============================================================

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
    hp:  calcStat(bHp,  iv.hp,  ev.hp,  lv, 1,       true),
    atk: calcStat(bAtk, iv.atk, ev.atk, lv, n.atk,   false),
    def: calcStat(bDef, iv.def, ev.def, lv, n.def,   false),
    spa: calcStat(bSpa, iv.spa, ev.spa, lv, n.spa,   false),
    spd: calcStat(bSpd, iv.spd, ev.spd, lv, n.spd,   false),
    spe: calcStat(bSpe, iv.spe, ev.spe, lv, n.spe,   false),
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

// Returns { min, max, rolls } where rolls is array of 16 damage values
function calcDamageRolls(attacker, atkStats, moveKey, defenderMon, defStats, options = {}) {
  const moveData = MOVES[moveKey];
  if (!moveData) return null;

  let [basePower, moveType, category] = moveData;

  if (category === 'X') return null; // status move
  if (basePower <= 0) return null;   // variable power — skip for now

  const isPhysical = category === 'P';
  const atkStat = isPhysical ? atkStats.atk : atkStats.spa;
  const defStat = isPhysical ? defStats.def : defStats.spd;

  // Item modifiers on attack stat
  let atkStatMod = atkStat;
  if (options.attackerItem === 'Choice Band' && isPhysical) atkStatMod = Math.floor(atkStat * 1.5);
  if (options.attackerItem === 'Choice Specs' && !isPhysical) atkStatMod = Math.floor(atkStat * 1.5);

  // Burn halves physical attack
  if (options.burned && isPhysical) atkStatMod = Math.floor(atkStatMod * 0.5);

  // Stage modifiers: -6 to +6
  const atkStage = options.atkStage || 0;
  const defStage = options.defStage || 0;
  const atkMult = atkStage >= 0 ? (2 + atkStage) / 2 : 2 / (2 - atkStage);
  const defMult = defStage >= 0 ? (2 + defStage) / 2 : 2 / (2 - defStage);
  atkStatMod = Math.floor(atkStatMod * atkMult);
  const defStatFinal = Math.floor(defStat * defMult);

  const level = attacker.level;

  // Base damage
  const base = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * basePower * atkStatMod / defStatFinal) / 50) + 2;

  // Collect modifiers
  const defData = POKEMON_DATA[defenderMon.name];
  const atkData = POKEMON_DATA[attacker.name];
  const defTypes = defData ? [defData[6], defData[7]].filter(Boolean) : [];
  const atkTypes = atkData ? [atkData[6], atkData[7]].filter(Boolean) : [];

  const typeEff = getTypeEffectiveness(moveType, defTypes);
  if (typeEff === 0) return { immune: true, effectiveness: 0 };

  const stab = hasSTAB(moveType, atkTypes) ? 1.5 : 1.0;

  // Item modifiers on damage
  let itemMod = 1.0;
  if (options.attackerItem === 'Life Orb') itemMod = 1.3;
  if (options.attackerItem === 'Expert Belt' && typeEff > 1) itemMod = 1.2;
  if (options.attackerItem === 'Muscle Band' && isPhysical) itemMod = 1.1;
  if (options.attackerItem === 'Wise Glasses' && !isPhysical) itemMod = 1.1;

  // Screen halves damage
  let screenMod = 1.0;
  if (options.reflect && isPhysical) screenMod = 0.5;
  if (options.lightScreen && !isPhysical) screenMod = 0.5;

  // Critical hit (2x in Gen 4)
  const critMod = options.crit ? 2.0 : 1.0;

  // Compute 16 random rolls (85/100 to 100/100)
  const rolls = [];
  for (let i = 0; i <= 15; i++) {
    const randNumer = 85 + i;
    let dmg = base;
    dmg = Math.floor(dmg * stab);
    // Type effectiveness applied via chain multiply
    if (typeEff === 0.25) { dmg = Math.floor(dmg * 0.25); }
    else if (typeEff === 0.5) { dmg = Math.floor(dmg * 0.5); }
    else if (typeEff === 2) { dmg = dmg * 2; }
    else if (typeEff === 4) { dmg = dmg * 4; }
    dmg = Math.floor(dmg * itemMod);
    dmg = Math.floor(dmg * screenMod);
    dmg = Math.floor(dmg * critMod);
    dmg = Math.floor(dmg * randNumer / 100);
    rolls.push(Math.max(1, dmg));
  }

  const min = rolls[0];
  const max = rolls[15];
  const defHP = defStats.hp;

  return {
    immune: false,
    effectiveness: typeEff,
    moveType,
    category,
    basePower,
    stab: stab > 1,
    min,
    max,
    defHP,
    minPct: min / defHP * 100,
    maxPct: max / defHP * 100,
    rolls,
    ohko: min >= defHP,
    twoHko: min * 2 >= defHP,
    threeHko: min * 3 >= defHP,
  };
}

function getKoLabel(result) {
  if (!result || result.immune) return '';
  if (result.ohko) return 'OHKO';
  if (result.twoHko) return '2HKO';
  if (result.threeHko) return '3HKO';
  if (result.max >= result.defHP) return 'Possible OHKO';
  if (result.max * 2 >= result.defHP) return 'Possible 2HKO';
  return '';
}

function getEffectivenessLabel(eff) {
  if (eff === 0) return 'Immune';
  if (eff === 0.25) return '¼×';
  if (eff === 0.5) return '½×';
  if (eff === 1) return '1×';
  if (eff === 2) return '2×';
  if (eff === 4) return '4×';
  return `${eff}×`;
}
