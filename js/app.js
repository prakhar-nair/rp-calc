// ============================================================
// APP LOGIC
// ============================================================

const WEATHER_OPTIONS = ['None','Sun','Rain','Sand','Hail','Snow','Fog','Harsh Sunshine','Heavy Rain','Strong Winds'];
const TERRAIN_OPTIONS = ['None','Electric','Grassy','Misty','Psychic'];
const STATUS_OPTIONS  = ['Healthy','Burned','Poisoned','Badly Poisoned','Paralyzed','Asleep','Frozen'];
const BADGES = [
  { id:'badgeAtk', label:'Coal Badge', stat:'Atk', mod:'atk' },
  { id:'badgeDef', label:'Forest Badge', stat:'Def', mod:'def' },
  { id:'badgeSpe', label:'Cobble Badge', stat:'Spe', mod:'spe' },
  { id:'badgeSpa', label:'Fen Badge', stat:'SpA', mod:'spa' },
  { id:'badgeSpd', label:'Relic Badge', stat:'SpD', mod:'spd' },
];

const state = {
  trainerIdx: 0,
  monIdx: 0,
  box: [],
  boxIdx: 0,
  attacker: {
    name: 'Garchomp',
    level: 50,
    nature: 'Jolly',
    item: 'None',
    ability: '',
    ivs: { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 },
    evs: { hp:0,  atk:0,  def:0,  spa:0,  spd:0,  spe:0  },
    status: 'Healthy',
    moves: ['Earthquake','Dragon Claw','Stone Edge','Swords Dance'],
    moveCrits: [false, false, false, false],
    moveHits:  [1, 1, 1, 1],
  },
  options: {
    atkStage: 0,
    defStage: 0,
    // Field
    weather:     'None',
    terrain:     'None',
    helpingHand: false,
    tailwindAtk: false,
    tailwindDef: false,
    // Hazards on defender side
    stealthRock: false,
    spikes: 0,
    // Screens on defender side
    reflect:     false,
    lightScreen: false,
    auroraVeil:  false,
    // Badge boosts (RP-specific)
    badgeAtk: false,
    badgeDef: false,
    badgeSpe: false,
    badgeSpa: false,
    badgeSpd: false,
    // Defender
    defStatus:    'Healthy',
    defCurrentHP: null,    // null = full HP
  },
};

// ---- Getters ----
function currentTrainer() { return TRAINERS[state.trainerIdx]; }
function currentMon()     { return currentTrainer().team[state.monIdx]; }
function trainerCount()   { return TRAINERS.length; }
function monCount()       { return currentTrainer().team.length; }

// ---- Navigation ----
function nextMon() {
  if (state.monIdx < monCount() - 1) { state.monIdx++; }
  else if (state.trainerIdx < trainerCount() - 1) { state.trainerIdx++; state.monIdx = 0; }
  state.options.defCurrentHP = null;
  render();
}
function prevMon() {
  if (state.monIdx > 0) { state.monIdx--; }
  else if (state.trainerIdx > 0) { state.trainerIdx--; state.monIdx = currentTrainer().team.length - 1; }
  state.options.defCurrentHP = null;
  render();
}
function nextTrainer() {
  if (state.trainerIdx < trainerCount() - 1) { state.trainerIdx++; state.monIdx = 0; }
  state.options.defCurrentHP = null;
  render();
}
function prevTrainer() {
  if (state.trainerIdx > 0) { state.trainerIdx--; state.monIdx = 0; }
  state.options.defCurrentHP = null;
  render();
}
function goToTrainer(idx) {
  state.trainerIdx = Math.max(0, Math.min(trainerCount()-1, idx));
  state.monIdx = 0;
  state.options.defCurrentHP = null;
  render();
}
function goToMon(idx) {
  state.monIdx = Math.max(0, Math.min(monCount()-1, idx));
  state.options.defCurrentHP = null;
  render();
}
function resetAttacker() {
  state.attacker = {
    name:'Garchomp', level:50, nature:'Jolly', item:'None', ability:'', status:'Healthy',
    ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},
    evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},
    moves:['Earthquake','Dragon Claw','Stone Edge','Swords Dance'],
    moveCrits:[false,false,false,false],
    moveHits:[1,1,1,1],
  };
  state.options = {
    atkStage:0, defStage:0,
    weather:'None', terrain:'None',
    helpingHand:false, tailwindAtk:false, tailwindDef:false,
    stealthRock:false, spikes:0,
    reflect:false, lightScreen:false, auroraVeil:false,
    badgeAtk:false, badgeDef:false, badgeSpe:false, badgeSpa:false, badgeSpd:false,
    defStatus:'Healthy', defCurrentHP:null,
  };
  syncAttackerInputsToState();
  syncOptionsInputsToState();
  render();
}

// ---- Autocomplete ----
function setupAutocomplete(inputEl, dataList, onSelect) {
  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  inputEl.parentNode.style.position = 'relative';
  inputEl.parentNode.appendChild(dropdown);

  inputEl.addEventListener('input', () => {
    const val = inputEl.value.toLowerCase();
    dropdown.innerHTML = '';
    if (!val) { dropdown.style.display = 'none'; return; }
    const matches = dataList.filter(d => d.toLowerCase().startsWith(val))
      .concat(dataList.filter(d => d.toLowerCase().includes(val) && !d.toLowerCase().startsWith(val)))
      .slice(0, 8);
    if (!matches.length) { dropdown.style.display = 'none'; return; }
    matches.forEach(m => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = m;
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        inputEl.value = m;
        onSelect(m);
        dropdown.style.display = 'none';
      });
      dropdown.appendChild(item);
    });
    dropdown.style.display = 'block';
  });
  inputEl.addEventListener('blur', () => setTimeout(() => { dropdown.style.display = 'none'; }, 150));
}

// ---- Bind all attacker inputs ----
function bindAttackerInputs() {
  const pokemonNames = Object.keys(POKEMON_DATA);
  const moveNames = Object.keys(MOVES);
  const itemNames = [
    'None','Life Orb','Choice Band','Choice Specs','Expert Belt',
    'Muscle Band','Wise Glasses','Leftovers','Focus Sash','Sitrus Berry',
    'Lum Berry','Rocky Helmet','Assault Vest','Eviolite','Black Sludge',
    'Flame Orb','Toxic Orb','Choice Scarf','Power Herb','White Herb',
  ];

  const nameInput = document.getElementById('atk-name');
  setupAutocomplete(nameInput, pokemonNames, v => { state.attacker.name = v; updateAttackerStats(); renderResults(); });
  nameInput.addEventListener('change', () => {
    if (POKEMON_DATA[nameInput.value]) { state.attacker.name = nameInput.value; updateAttackerStats(); renderResults(); }
  });

  document.getElementById('atk-level').addEventListener('input', e => {
    state.attacker.level = Math.max(1, Math.min(100, parseInt(e.target.value)||50));
    updateAttackerStats(); renderResults();
  });

  // Nature select — populate
  const natSel = document.getElementById('atk-nature');
  Object.keys(NATURES).forEach(n => {
    const opt = document.createElement('option');
    opt.value = n; opt.textContent = n;
    if (n === state.attacker.nature) opt.selected = true;
    natSel.appendChild(opt);
  });
  natSel.addEventListener('change', e => { state.attacker.nature = e.target.value; updateAttackerStats(); renderResults(); });

  const itemInput = document.getElementById('atk-item');
  setupAutocomplete(itemInput, itemNames, v => { state.attacker.item = v; renderResults(); });
  itemInput.addEventListener('change', e => { state.attacker.item = e.target.value; renderResults(); });

  document.getElementById('atk-status').addEventListener('change', e => { state.attacker.status = e.target.value; renderResults(); });

  ['hp','atk','def','spa','spd','spe'].forEach(stat => {
    document.getElementById(`atk-ev-${stat}`).addEventListener('input', e => {
      state.attacker.evs[stat] = Math.max(0, Math.min(252, parseInt(e.target.value)||0));
      updateAttackerStats(); renderResults();
    });
    document.getElementById(`atk-iv-${stat}`).addEventListener('input', e => {
      state.attacker.ivs[stat] = Math.max(0, Math.min(31, parseInt(e.target.value)||31));
      updateAttackerStats(); renderResults();
    });
  });

  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`atk-move-${i}`);
    setupAutocomplete(el, moveNames, v => { state.attacker.moves[i] = v; renderResults(); });
    el.addEventListener('change', () => { state.attacker.moves[i] = el.value; renderResults(); });

    document.getElementById(`move-crit-${i}`).addEventListener('change', e => {
      state.attacker.moveCrits[i] = e.target.checked; renderResults();
    });
    document.getElementById(`move-hits-${i}`).addEventListener('change', e => {
      state.attacker.moveHits[i] = Math.max(1, parseInt(e.target.value)||1); renderResults();
    });
  }
}

// ---- Bind field / options inputs ----
function bindOptionsInputs() {
  const bind = (id, key, type='checkbox') => {
    const el = document.getElementById(id);
    if (!el) return;
    if (type === 'checkbox') {
      el.addEventListener('change', e => { state.options[key] = e.target.checked; renderResults(); });
    } else {
      el.addEventListener('change', e => {
        state.options[key] = type === 'int' ? parseInt(e.target.value)||0 : e.target.value;
        renderResults();
      });
    }
  };

  bind('field-weather',     'weather', 'select');
  bind('field-terrain',     'terrain', 'select');
  bind('opt-helping-hand',  'helpingHand');
  bind('opt-tailwind-atk',  'tailwindAtk');
  bind('opt-tailwind-def',  'tailwindDef');
  bind('opt-stealth-rock',  'stealthRock');
  bind('opt-aurora-veil',   'auroraVeil');
  bind('opt-reflect',       'reflect');
  bind('opt-lightscreen',   'lightScreen');

  document.getElementById('opt-spikes').addEventListener('change', e => {
    state.options.spikes = parseInt(e.target.value)||0; renderResults();
  });

  document.getElementById('atk-stage').addEventListener('change', e => {
    state.options.atkStage = parseInt(e.target.value)||0; renderResults();
  });
  document.getElementById('def-stage').addEventListener('change', e => {
    state.options.defStage = parseInt(e.target.value)||0; renderResults();
  });

  document.getElementById('def-status').addEventListener('change', e => {
    state.options.defStatus = e.target.value; renderResults();
  });

  BADGES.forEach(b => {
    document.getElementById(b.id).addEventListener('change', e => {
      state.options[b.id] = e.target.checked; renderResults();
    });
  });

  // Defender current HP
  document.getElementById('def-current-hp').addEventListener('input', e => {
    const val = parseInt(e.target.value);
    const defMon  = currentMon();
    const defStats = getStats(defMon);
    const maxHP = defStats ? defStats.hp : 1;
    state.options.defCurrentHP = isNaN(val) ? null : Math.max(1, Math.min(maxHP, val));
    updateDefHPBar();
    renderResults();
  });
}

function updateAttackerStats() {
  const stats = getStats(state.attacker);
  if (!stats) return;
  ['hp','atk','def','spa','spd','spe'].forEach(s => {
    const el = document.getElementById(`atk-stat-${s}`);
    if (el) el.textContent = stats[s];
  });
  const sprite = document.getElementById('atk-sprite');
  if (sprite) sprite.src = getSpriteUrl(state.attacker.name);
}

function updateDefHPBar() {
  const defMon   = currentMon();
  const defStats = getStats(defMon);
  if (!defStats) return;
  const maxHP  = defStats.hp;
  const curHP  = state.options.defCurrentHP != null ? state.options.defCurrentHP : maxHP;
  const pct    = Math.max(0, Math.min(100, curHP / maxHP * 100));
  const bar    = document.getElementById('def-hp-bar-fill');
  const label  = document.getElementById('def-hp-label');
  if (bar)   { bar.style.width = pct + '%'; bar.className = 'def-hp-fill ' + (pct > 50 ? 'hp-green' : pct > 25 ? 'hp-yellow' : 'hp-red'); }
  if (label) label.textContent = `${curHP} / ${maxHP} HP (${pct.toFixed(1)}%)`;
  const inp = document.getElementById('def-current-hp');
  if (inp)   { inp.max = maxHP; if (inp.value > maxHP) inp.value = maxHP; }
}

// ---- Sync inputs ↔ state ----
function syncAttackerInputsToState() {
  const a = state.attacker;
  const set = (id, v) => { const el=document.getElementById(id); if(el) el.value=v; };
  set('atk-name', a.name);
  set('atk-level', a.level);
  set('atk-nature', a.nature);
  set('atk-item', a.item);
  set('atk-status', a.status);
  for (let i=0;i<4;i++) {
    set(`atk-move-${i}`, a.moves[i]||'');
    const crit = document.getElementById(`move-crit-${i}`);
    if (crit) crit.checked = a.moveCrits[i];
    set(`move-hits-${i}`, a.moveHits[i]);
  }
  ['hp','atk','def','spa','spd','spe'].forEach(s => {
    set(`atk-ev-${s}`, a.evs[s]);
    set(`atk-iv-${s}`, a.ivs[s]);
  });
  updateAttackerStats();
}
function syncOptionsInputsToState() {
  const o = state.options;
  const set = (id, v, type='val') => {
    const el = document.getElementById(id);
    if (!el) return;
    if (type==='check') el.checked = v; else el.value = v;
  };
  set('field-weather',    o.weather, 'val');
  set('field-terrain',    o.terrain, 'val');
  set('opt-helping-hand', o.helpingHand, 'check');
  set('opt-tailwind-atk', o.tailwindAtk, 'check');
  set('opt-tailwind-def', o.tailwindDef, 'check');
  set('opt-stealth-rock', o.stealthRock, 'check');
  set('opt-spikes',       o.spikes, 'val');
  set('opt-reflect',      o.reflect, 'check');
  set('opt-lightscreen',  o.lightScreen, 'check');
  set('opt-aurora-veil',  o.auroraVeil, 'check');
  set('atk-stage',        o.atkStage, 'val');
  set('def-stage',        o.defStage, 'val');
  set('def-status',       o.defStatus, 'val');
  BADGES.forEach(b => set(b.id, o[b.id], 'check'));
}

// ---- Main render ----
function render() {
  renderTrainerNav();
  renderDefender();
  renderMonDots();
  updateDefHPBar();
  renderResults();
}

function renderTrainerNav() {
  const trainer = currentTrainer();
  document.getElementById('trainer-name').textContent     = trainer.name;
  document.getElementById('trainer-title').textContent    = trainer.title + (trainer.badge ? ` — ${trainer.badge}` : '');
  document.getElementById('trainer-location').textContent = trainer.location;
  document.getElementById('trainer-counter').textContent  = `${state.trainerIdx + 1} / ${trainerCount()}`;

  const typeBadge = document.getElementById('trainer-type');
  typeBadge.textContent   = trainer.type;
  typeBadge.style.background = TYPE_COLORS[trainer.type] || '#666';

  document.querySelectorAll('.trainer-list-item').forEach((el, i) => el.classList.toggle('active', i === state.trainerIdx));

  document.getElementById('btn-prev-trainer').disabled = state.trainerIdx === 0;
  document.getElementById('btn-next-trainer').disabled = state.trainerIdx === trainerCount() - 1;
  document.getElementById('btn-prev-mon').disabled = state.trainerIdx === 0 && state.monIdx === 0;
  document.getElementById('btn-next-mon').disabled = state.trainerIdx === trainerCount()-1 && state.monIdx === monCount()-1;
}

function renderMonDots() {
  const dotsEl = document.getElementById('mon-dots');
  dotsEl.innerHTML = '';
  currentTrainer().team.forEach((mon, i) => {
    const dot = document.createElement('button');
    dot.className = 'mon-dot' + (i === state.monIdx ? ' active' : '');
    dot.title = `${mon.name} Lv.${mon.level}`;
    dot.addEventListener('click', () => goToMon(i));
    const img = document.createElement('img');
    img.src = getSpriteUrl(mon.name);
    img.className = 'mon-dot-sprite';
    dot.appendChild(img);
    dotsEl.appendChild(dot);
  });
}

function renderDefender() {
  const mon = currentMon();
  const defStats = getStats(mon);
  const data  = POKEMON_DATA[mon.name];
  const types = data ? [data[6], data[7]].filter(Boolean) : [];

  document.getElementById('def-name').textContent    = mon.name.replace(/_/g,' ');
  document.getElementById('def-level').textContent   = `Lv. ${mon.level}`;
  document.getElementById('def-nature').textContent  = mon.nature;
  document.getElementById('def-ability').textContent = mon.ability;
  document.getElementById('def-item').textContent    = mon.item;
  document.getElementById('def-sprite').src          = getSpriteUrl(mon.name);
  document.getElementById('def-mon-counter').textContent = `${state.monIdx + 1} / ${monCount()}`;

  const typesEl = document.getElementById('def-types');
  typesEl.innerHTML = '';
  types.forEach(t => {
    const badge = document.createElement('span');
    badge.className = 'type-badge';
    badge.textContent = t;
    badge.style.background = TYPE_COLORS[t] || '#666';
    typesEl.appendChild(badge);
  });

  if (defStats) {
    ['hp','atk','def','spa','spd','spe'].forEach(s => {
      const el = document.getElementById(`def-stat-${s}`);
      if (el) el.textContent = defStats[s];
    });
    // Reset current HP input max
    const hpInput = document.getElementById('def-current-hp');
    if (hpInput) {
      hpInput.max = defStats.hp;
      hpInput.placeholder = defStats.hp;
    }
  }

  const movesEl = document.getElementById('def-moves');
  movesEl.innerHTML = '';
  mon.moves.forEach(m => {
    const moveData = MOVES[m];
    const li = document.createElement('div');
    li.className = 'def-move';
    if (moveData) {
      const typeTag = document.createElement('span');
      typeTag.className = 'move-type-tag';
      typeTag.textContent = moveData[1];
      typeTag.style.background = TYPE_COLORS[moveData[1]] || '#555';
      const catTag = document.createElement('span');
      catTag.className = `move-cat move-cat-${moveData[2]}`;
      catTag.textContent = moveData[2]==='P'?'Phys':moveData[2]==='S'?'Spec':'Stat';
      li.appendChild(typeTag);
      li.appendChild(catTag);
    }
    const name = document.createElement('span');
    name.className = 'move-name';
    name.textContent = m;
    li.appendChild(name);
    if (moveData && moveData[0] > 0) {
      const power = document.createElement('span');
      power.className = 'move-power';
      power.textContent = moveData[0];
      li.appendChild(power);
    }
    movesEl.appendChild(li);
  });
}

// ---- Results ----
function renderResults() {
  const resultsEl = document.getElementById('results-list');
  resultsEl.innerHTML = '';

  const attacker  = state.attacker;
  const defender  = currentMon();
  const atkStats  = getStats(attacker);
  const defStats  = getStats(defender);

  if (!atkStats || !defStats) {
    resultsEl.innerHTML = '<div class="result-empty">Unknown Pokémon — check spelling</div>';
    return;
  }

  updateAttackerStats();

  const defData  = POKEMON_DATA[defender.name];
  const defTypes = defData ? [defData[6], defData[7]].filter(Boolean) : [];

  // ---- Speed comparison ----
  const speedInfo = compareSpeed(atkStats, defStats, {
    attackerStatus: attacker.status,
    defStatus: state.options.defStatus,
    tailwindAtk: state.options.tailwindAtk,
    tailwindDef: state.options.tailwindDef,
    badgeSpe: state.options.badgeSpe,
    weather: state.options.weather,
  });
  renderSpeedBanner(speedInfo);

  // ---- Entry hazard damage ----
  renderHazardBanner(defStats, defTypes);

  // ---- Weather / Terrain indicator ----
  renderFieldTags();

  // ---- Damage results per move ----
  const opts = {
    attackerItem:   attacker.item,
    attackerStatus: attacker.status,
    atkStage:       state.options.atkStage,
    defStage:       state.options.defStage,
    weather:        state.options.weather,
    terrain:        state.options.terrain,
    helpingHand:    state.options.helpingHand,
    reflect:        state.options.reflect,
    lightScreen:    state.options.lightScreen,
    auroraVeil:     state.options.auroraVeil,
    defStatus:      state.options.defStatus,
    defCurrentHP:   state.options.defCurrentHP,
    badgeAtk:       state.options.badgeAtk,
    badgeSpa:       state.options.badgeSpa,
  };

  let hasAnyDamage = false;

  attacker.moves.forEach((moveKey, idx) => {
    if (!moveKey) return;
    const moveOpts = {
      ...opts,
      crit:     attacker.moveCrits[idx],
      hitCount: attacker.moveHits[idx],
    };
    const result   = calcDamageRolls(attacker, atkStats, moveKey, defender, defStats, moveOpts);
    const moveData = MOVES[moveKey];

    const card = document.createElement('div');
    card.className = 'result-card';

    if (!result || !moveData) {
      card.innerHTML = `<span class="result-move-name">${moveKey}</span><span class="result-detail muted">—</span>`;
      resultsEl.appendChild(card);
      return;
    }

    const [power, mType, cat] = moveData;

    if (result.immune) {
      card.classList.add('result-immune');
      card.innerHTML = `<div class="result-top">
        <span class="move-type-tag" style="background:${TYPE_COLORS[mType]||'#555'}">${mType}</span>
        <span class="result-move-name">${moveKey}</span>
        <span class="ko-tag" style="background:#444;color:#888">Immune</span>
      </div>`;
      resultsEl.appendChild(card);
      return;
    }

    if (cat === 'X' || power <= 0) {
      card.innerHTML = `<div class="result-top">
        <span class="move-type-tag" style="background:${TYPE_COLORS[mType]||'#555'}">${mType}</span>
        <span class="result-move-name">${moveKey}</span>
        <span class="result-label status-label">Status</span>
      </div>`;
      resultsEl.appendChild(card);
      return;
    }

    hasAnyDamage = true;
    const koLabel  = getKoLabel(result);
    const effLabel = getEffectivenessLabel(result.effectiveness);
    const pctMin   = result.minPct.toFixed(1);
    const pctMax   = result.maxPct.toFixed(1);
    const hitStr   = result.hitCount > 1 ? ` (×${result.hitCount})` : '';

    // If tracking current HP, show vs current HP too
    const isPartialHP = state.options.defCurrentHP != null && state.options.defCurrentHP < defStats.hp;
    const dmgLine = isPartialHP
      ? `${result.min} – ${result.max} HP${hitStr} &nbsp;·&nbsp; ${pctMin}%–${pctMax}% max HP &nbsp;·&nbsp; ${result.minCurPct.toFixed(1)}%–${result.maxCurPct.toFixed(1)}% current HP`
      : `${result.min} – ${result.max} HP${hitStr} &nbsp;·&nbsp; ${pctMin}% – ${pctMax}%`;

    let koClass = '';
    if (koLabel === 'OHKO')              koClass = 'ko-ohko';
    else if (koLabel === 'Possible OHKO') koClass = 'ko-possible';
    else if (koLabel === '2HKO')          koClass = 'ko-2hko';
    else if (koLabel === 'Possible 2HKO') koClass = 'ko-possible';
    else if (koLabel === '3HKO')          koClass = 'ko-3hko';

    let effClass = result.effectiveness > 1 ? 'eff-super' : result.effectiveness < 1 ? 'eff-not' : '';
    const wTag = result.weatherBoosted ? '<span class="weather-boost-tag">☀/🌧</span>' : result.weatherReduced ? '<span class="weather-reduce-tag">☀/🌧</span>' : '';
    const tTag = result.terrainBoosted ? '<span class="terrain-boost-tag">⚡ Terrain</span>' : '';

    const barPct = Math.min(100, result.maxPct);
    const barMin = Math.min(100, result.minPct);

    card.innerHTML = `
      <div class="result-top">
        <span class="move-type-tag" style="background:${TYPE_COLORS[mType]||'#555'}">${mType}</span>
        <span class="result-move-name">${moveKey}</span>
        <span class="result-power">${power}${hitStr} BP</span>
        ${result.stab ? '<span class="stab-tag">STAB</span>' : ''}
        <span class="eff-tag ${effClass}">${effLabel}</span>
        ${wTag}${tTag}
        ${moveOpts.crit ? '<span class="crit-tag">Crit</span>' : ''}
        ${koLabel ? `<span class="ko-tag ${koClass}">${koLabel}</span>` : ''}
      </div>
      <div class="result-dmg">${dmgLine}</div>
      <div class="result-bar-wrap">
        <div class="result-bar">
          <div class="result-bar-max" style="width:${barPct}%"></div>
          <div class="result-bar-min" style="width:${barMin}%"></div>
        </div>
      </div>`;
    resultsEl.appendChild(card);
  });

  if (!hasAnyDamage) {
    const empty = document.createElement('div');
    empty.className = 'result-empty';
    empty.textContent = 'Enter moves above to see damage calculations.';
    resultsEl.appendChild(empty);
  }
}

function renderSpeedBanner(info) {
  const el = document.getElementById('speed-banner');
  if (!el) return;
  const atkName = state.attacker.name;
  const defName = currentMon().name.replace(/_/g,' ');
  let html, cls;
  if (info.faster === 'atk') {
    cls = 'speed-banner-atk';
    html = `⚡ <strong>${atkName}</strong> is faster &nbsp;(${info.atkSpe} vs ${info.defSpe})`;
  } else if (info.faster === 'def') {
    cls = 'speed-banner-def';
    html = `⚡ <strong>${defName}</strong> moves first &nbsp;(${info.defSpe} vs ${info.atkSpe})`;
  } else {
    cls = 'speed-banner-tie';
    html = `⚡ Speed tie &nbsp;(${info.atkSpe})`;
  }
  el.innerHTML = html;
  el.className = 'speed-banner ' + cls;
}

function renderHazardBanner(defStats, defTypes) {
  const el = document.getElementById('hazard-banner');
  if (!el) return;
  const parts = [];

  if (state.options.stealthRock) {
    const frac = calcStealthRockDamage(defTypes);
    const dmg  = Math.floor(defStats.hp * frac);
    const eff  = getTypeEffectiveness('Rock', defTypes);
    const effStr = eff === 1 ? '' : eff > 1 ? ` (${getEffectivenessLabel(eff)} Rock)` : ` (${getEffectivenessLabel(eff)} Rock)`;
    parts.push(`🪨 Stealth Rock: ${dmg} HP (${(frac*100).toFixed(1)}%)${effStr}`);
  }
  if (state.options.spikes > 0) {
    const isFlying = defTypes.includes('Flying');
    if (!isFlying) {
      const frac = calcSpikesDamage(state.options.spikes, defTypes);
      const dmg  = Math.floor(defStats.hp * frac);
      parts.push(`📌 Spikes (${state.options.spikes}): ${dmg} HP (${(frac*100).toFixed(1)}%)`);
    } else {
      parts.push(`📌 Spikes: No effect (Flying)`);
    }
  }

  if (!parts.length) { el.setAttribute('hidden',''); return; }
  el.removeAttribute('hidden');
  el.innerHTML = parts.map(p => `<span class="hazard-item">${p}</span>`).join('');
}

function renderFieldTags() {
  const el = document.getElementById('field-tags');
  if (!el) return;
  const tags = [];
  const w = state.options.weather;
  const t = state.options.terrain;
  const weatherIcons = { Sun:'☀️', Rain:'🌧', Sand:'🌪', Hail:'❄️', Snow:'🌨', Fog:'🌫',
                         'Harsh Sunshine':'☀️☀️', 'Heavy Rain':'🌊', 'Strong Winds':'💨' };
  const terrainIcons = { Electric:'⚡', Grassy:'🌿', Misty:'🌫', Psychic:'🔮' };

  if (w && w !== 'None') tags.push(`<span class="field-tag weather-tag">${weatherIcons[w]||''} ${w}</span>`);
  if (t && t !== 'None') tags.push(`<span class="field-tag terrain-tag">${terrainIcons[t]||''} ${t} Terrain</span>`);
  if (state.options.helpingHand)  tags.push(`<span class="field-tag">Helping Hand</span>`);
  if (state.options.tailwindAtk)  tags.push(`<span class="field-tag">Tailwind (Atk)</span>`);
  if (state.options.tailwindDef)  tags.push(`<span class="field-tag">Tailwind (Def)</span>`);

  if (!tags.length) { el.innerHTML = ''; return; }
  el.innerHTML = tags.join('');
}

// ---- Sidebar trainer list ----
function renderTrainerList() {
  const list = document.getElementById('trainer-list');
  list.innerHTML = '';
  TRAINERS.forEach((t, i) => {
    const item = document.createElement('button');
    item.className = 'trainer-list-item' + (i === state.trainerIdx ? ' active' : '');
    const typeColor = TYPE_COLORS[t.type] || '#888';
    item.innerHTML = `
      <span class="tl-dot" style="background:${typeColor}"></span>
      <span class="tl-name">${t.name}</span>
      <span class="tl-badge">${t.badge || t.title}</span>`;
    item.addEventListener('click', () => goToTrainer(i));
    list.appendChild(item);
  });
}

// ============================================================
// BOX IMPORT
// ============================================================

function parseShowdownPaste(text) {
  const sets = [];
  const blocks = text.trim().split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const firstLine = lines[0];
    const atIdx = firstLine.indexOf(' @ ');
    const namePart = atIdx !== -1 ? firstLine.slice(0, atIdx) : firstLine;
    const item = atIdx !== -1 ? firstLine.slice(atIdx + 3).trim() : 'None';

    const parenMatch = namePart.match(/\(([^)]+)\)\s*$/);
    const rawName = (parenMatch ? parenMatch[1] : namePart).replace(/\s*\([MF]\)\s*$/, '').trim();

    let ability='', level=50, nature='Hardy';
    const evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
    const ivs={hp:31,atk:31,def:31,spa:31,spd:31,spe:31};
    const moves=[];

    for (let i=1; i<lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('Ability:')) { ability = line.slice(8).trim(); }
      else if (line.startsWith('Level:')) { level = Math.max(1, Math.min(100, parseInt(line.slice(6))||50)); }
      else if (line.startsWith('EVs:')) {
        line.slice(4).trim().split('/').forEach(p => {
          const m = p.trim().match(/^(\d+)\s+(.+)$/);
          if (!m) return;
          const v=Math.min(252, parseInt(m[1])), s=m[2].trim().toLowerCase();
          if (s==='hp') evs.hp=v; else if (s==='atk') evs.atk=v; else if (s==='def') evs.def=v;
          else if (s.startsWith('spa')) evs.spa=v; else if (s.startsWith('spd')) evs.spd=v;
          else if (s.startsWith('spe')) evs.spe=v;
        });
      } else if (line.startsWith('IVs:')) {
        line.slice(4).trim().split('/').forEach(p => {
          const m = p.trim().match(/^(\d+)\s+(.+)$/);
          if (!m) return;
          const v=Math.min(31, parseInt(m[1])), s=m[2].trim().toLowerCase();
          if (s==='hp') ivs.hp=v; else if (s==='atk') ivs.atk=v; else if (s==='def') ivs.def=v;
          else if (s.startsWith('spa')) ivs.spa=v; else if (s.startsWith('spd')) ivs.spd=v;
          else if (s.startsWith('spe')) ivs.spe=v;
        });
      } else if (line.endsWith(' Nature')) {
        nature = line.replace(' Nature','').trim();
      } else if (line.startsWith('- ') && moves.length < 4) {
        moves.push(line.slice(2).trim());
      }
    }
    while (moves.length < 4) moves.push('');
    sets.push({ name:rawName, item, ability, level, nature, evs, ivs, moves,
                moveCrits:[false,false,false,false], moveHits:[1,1,1,1] });
  }
  return sets;
}

function exportToShowdown() {
  const a = state.attacker;
  const lines = [];
  lines.push(`${a.name}${a.item && a.item!=='None' ? ' @ '+a.item : ''}`);
  if (a.ability) lines.push(`Ability: ${a.ability}`);
  lines.push(`Level: ${a.level}`);
  const evParts = [];
  [['hp','HP'],['atk','Atk'],['def','Def'],['spa','SpA'],['spd','SpD'],['spe','Spe']].forEach(([k,l]) => { if(a.evs[k]) evParts.push(`${a.evs[k]} ${l}`); });
  if (evParts.length) lines.push(`EVs: ${evParts.join(' / ')}`);
  const ivParts = [];
  [['hp','HP'],['atk','Atk'],['def','Def'],['spa','SpA'],['spd','SpD'],['spe','Spe']].forEach(([k,l]) => { if(a.ivs[k]!==31) ivParts.push(`${a.ivs[k]} ${l}`); });
  if (ivParts.length) lines.push(`IVs: ${ivParts.join(' / ')}`);
  lines.push(`${a.nature} Nature`);
  a.moves.filter(Boolean).forEach(m => lines.push(`- ${m}`));
  return lines.join('\n');
}

function openImportModal() { document.getElementById('import-modal').removeAttribute('hidden'); document.getElementById('import-textarea').focus(); }
function closeImportModal() { document.getElementById('import-modal').setAttribute('hidden',''); }

function doImport() {
  const text = document.getElementById('import-textarea').value.trim();
  if (!text) return;
  const sets = parseShowdownPaste(text);
  if (!sets.length) { alert('Could not parse any Pokémon. Use Showdown export format.'); return; }
  state.box = sets; state.boxIdx = 0;
  saveBoxToStorage();
  closeImportModal();
  loadFromBox(0);
  renderBox();
}

function loadFromBox(idx) {
  if (!state.box.length) return;
  idx = Math.max(0, Math.min(state.box.length-1, idx));
  state.boxIdx = idx;
  const mon = state.box[idx];
  state.attacker = {
    name:mon.name, level:mon.level, nature:mon.nature, item:mon.item||'None',
    ability:mon.ability||'', status:'Healthy',
    ivs:{...mon.ivs}, evs:{...mon.evs}, moves:[...mon.moves],
    moveCrits:[...(mon.moveCrits||[false,false,false,false])],
    moveHits:[...(mon.moveHits||[1,1,1,1])],
  };
  syncAttackerInputsToState();
  renderBox();
  render();
}

function renderBox() {
  const boxEl = document.getElementById('box-grid');
  const boxSection = document.getElementById('box-section');
  if (!state.box.length) { boxSection.setAttribute('hidden',''); return; }
  boxSection.removeAttribute('hidden');
  boxEl.innerHTML = '';
  state.box.forEach((mon,i) => {
    const card = document.createElement('button');
    card.className = 'box-card'+(i===state.boxIdx?' active':'');
    card.title = `${mon.name} Lv.${mon.level} · ${mon.nature} · ${mon.item}`;
    const img=document.createElement('img'); img.src=getSpriteUrl(mon.name); img.className='box-card-sprite'; img.onerror=()=>{img.style.display='none'};
    const nm=document.createElement('div'); nm.className='box-card-name'; nm.textContent=mon.name;
    const lv=document.createElement('div'); lv.className='box-card-lv'; lv.textContent=`Lv.${mon.level}`;
    card.append(img,nm,lv);
    card.addEventListener('click',()=>loadFromBox(i));
    boxEl.appendChild(card);
  });
  document.getElementById('box-prev').disabled = state.boxIdx <= 0;
  document.getElementById('box-next').disabled = state.boxIdx >= state.box.length-1;
  document.getElementById('box-counter').textContent = `${state.boxIdx+1} / ${state.box.length}`;
}

function saveBoxToStorage()  { try { localStorage.setItem('rp_box', JSON.stringify(state.box)); } catch(e){} }
function loadBoxFromStorage() {
  try {
    const raw = localStorage.getItem('rp_box');
    if (raw) { state.box = JSON.parse(raw); if (state.box.length) renderBox(); }
  } catch(e){}
}

// ---- Init ----
function init() {
  document.getElementById('btn-prev-mon').addEventListener('click', prevMon);
  document.getElementById('btn-next-mon').addEventListener('click', nextMon);
  document.getElementById('btn-prev-trainer').addEventListener('click', prevTrainer);
  document.getElementById('btn-next-trainer').addEventListener('click', nextTrainer);
  document.getElementById('btn-reset').addEventListener('click', resetAttacker);

  document.getElementById('btn-import').addEventListener('click', openImportModal);
  document.getElementById('btn-import-cancel').addEventListener('click', closeImportModal);
  document.getElementById('btn-import-confirm').addEventListener('click', doImport);
  document.getElementById('import-modal-backdrop').addEventListener('click', closeImportModal);
  document.addEventListener('keydown', e => { if (e.key==='Escape') closeImportModal(); });

  document.getElementById('btn-export').addEventListener('click', () => {
    const text = exportToShowdown();
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-export');
      btn.textContent = '✓ Copied!';
      setTimeout(() => btn.textContent = '⬇ Export', 1500);
    }).catch(() => { prompt('Copy this Showdown export:', text); });
  });

  document.getElementById('box-prev').addEventListener('click', () => loadFromBox(state.boxIdx-1));
  document.getElementById('box-next').addEventListener('click', () => loadFromBox(state.boxIdx+1));
  document.getElementById('btn-clear-box').addEventListener('click', () => {
    if (!state.box.length || confirm('Clear imported box?')) {
      state.box = []; saveBoxToStorage(); renderBox();
    }
  });

  bindAttackerInputs();
  bindOptionsInputs();
  syncAttackerInputsToState();
  syncOptionsInputsToState();

  loadBoxFromStorage();
  renderTrainerList();
  render();
}

document.addEventListener('DOMContentLoaded', init);
