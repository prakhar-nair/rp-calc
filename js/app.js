// ============================================================
// APP LOGIC - State management, UI, next/prev/reset
// ============================================================

const state = {
  trainerIdx: 0,
  monIdx: 0,
  box: [],        // imported Pokémon from Showdown paste
  boxIdx: 0,      // currently selected box slot
  attacker: {
    name: 'Garchomp',
    level: 50,
    nature: 'Jolly',
    item: 'None',
    ability: '',
    burned: false,
    atkStage: 0,
    ivs: { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 },
    evs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 },
    moves: ['Earthquake','Dragon Claw','Stone Edge','Swords Dance'],
  },
  options: {
    crit: false,
    reflect: false,
    lightScreen: false,
    defStage: 0,
  }
};

// ---- Getters ----
function currentTrainer() { return TRAINERS[state.trainerIdx]; }
function currentMon() { return currentTrainer().team[state.monIdx]; }
function trainerCount() { return TRAINERS.length; }
function monCount() { return currentTrainer().team.length; }

// ---- Navigation ----
function nextMon() {
  if (state.monIdx < monCount() - 1) {
    state.monIdx++;
  } else if (state.trainerIdx < trainerCount() - 1) {
    state.trainerIdx++;
    state.monIdx = 0;
  }
  render();
}
function prevMon() {
  if (state.monIdx > 0) {
    state.monIdx--;
  } else if (state.trainerIdx > 0) {
    state.trainerIdx--;
    state.monIdx = currentTrainer().team.length - 1;
  }
  render();
}
function nextTrainer() {
  if (state.trainerIdx < trainerCount() - 1) {
    state.trainerIdx++;
    state.monIdx = 0;
  }
  render();
}
function prevTrainer() {
  if (state.trainerIdx > 0) {
    state.trainerIdx--;
    state.monIdx = 0;
  }
  render();
}
function goToTrainer(idx) {
  state.trainerIdx = Math.max(0, Math.min(trainerCount()-1, idx));
  state.monIdx = 0;
  render();
}
function goToMon(idx) {
  state.monIdx = Math.max(0, Math.min(monCount()-1, idx));
  render();
}
function resetAttacker() {
  state.attacker = {
    name: 'Garchomp', level: 50, nature: 'Jolly', item: 'None',
    ability: '', burned: false, atkStage: 0,
    ivs: {hp:31,atk:31,def:31,spa:31,spd:31,spe:31},
    evs: {hp:0,atk:0,def:0,spa:0,spd:0,spe:0},
    moves: ['Earthquake','Dragon Claw','Stone Edge','Swords Dance'],
  };
  state.options = { crit:false, reflect:false, lightScreen:false, defStage:0 };
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
    const matches = dataList.filter(d => d.toLowerCase().includes(val)).slice(0, 8);
    if (!matches.length) { dropdown.style.display = 'none'; return; }
    matches.forEach(m => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = m;
      item.addEventListener('mousedown', (e) => {
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

// ---- Attacker input bindings ----
function bindAttackerInputs() {
  const pokemonNames = Object.keys(POKEMON_DATA);
  const moveNames = Object.keys(MOVES);
  const itemNames = [
    'None','Life Orb','Choice Band','Choice Specs','Expert Belt',
    'Muscle Band','Wise Glasses','Leftovers','Focus Sash','Sitrus Berry',
    'Lum Berry','Rocky Helmet','Assault Vest','Eviolite'
  ];

  // Pokemon name
  const nameInput = document.getElementById('atk-name');
  setupAutocomplete(nameInput, pokemonNames, (v) => {
    state.attacker.name = v;
    updateAttackerStats();
    renderResults();
  });
  nameInput.addEventListener('change', () => {
    if (POKEMON_DATA[nameInput.value]) {
      state.attacker.name = nameInput.value;
      updateAttackerStats();
      renderResults();
    }
  });

  // Level
  const levelInput = document.getElementById('atk-level');
  levelInput.addEventListener('input', () => {
    state.attacker.level = Math.max(1, Math.min(100, parseInt(levelInput.value)||50));
    updateAttackerStats();
    renderResults();
  });

  // Nature
  const natureSelect = document.getElementById('atk-nature');
  Object.keys(NATURES).forEach(n => {
    const opt = document.createElement('option');
    opt.value = n; opt.textContent = n;
    if (n === state.attacker.nature) opt.selected = true;
    natureSelect.appendChild(opt);
  });
  natureSelect.addEventListener('change', () => {
    state.attacker.nature = natureSelect.value;
    updateAttackerStats();
    renderResults();
  });

  // Item
  const itemInput = document.getElementById('atk-item');
  setupAutocomplete(itemInput, itemNames, (v) => {
    state.attacker.item = v;
    renderResults();
  });

  // EVs
  ['hp','atk','def','spa','spd','spe'].forEach(stat => {
    const el = document.getElementById(`atk-ev-${stat}`);
    el.addEventListener('input', () => {
      state.attacker.evs[stat] = Math.max(0, Math.min(252, parseInt(el.value)||0));
      updateAttackerStats();
      renderResults();
    });
  });

  // IVs
  ['hp','atk','def','spa','spd','spe'].forEach(stat => {
    const el = document.getElementById(`atk-iv-${stat}`);
    el.addEventListener('input', () => {
      state.attacker.ivs[stat] = Math.max(0, Math.min(31, parseInt(el.value)||31));
      updateAttackerStats();
      renderResults();
    });
  });

  // Moves
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`atk-move-${i}`);
    el.value = state.attacker.moves[i] || '';
    setupAutocomplete(el, moveNames, (v) => {
      state.attacker.moves[i] = v;
      renderResults();
    });
    el.addEventListener('change', () => {
      state.attacker.moves[i] = el.value;
      renderResults();
    });
  }

  // Atk stage
  const atkStageEl = document.getElementById('atk-stage');
  atkStageEl.addEventListener('change', () => {
    state.attacker.atkStage = parseInt(atkStageEl.value)||0;
    renderResults();
  });

  // Options
  document.getElementById('opt-crit').addEventListener('change', e => { state.options.crit = e.target.checked; renderResults(); });
  document.getElementById('opt-reflect').addEventListener('change', e => { state.options.reflect = e.target.checked; renderResults(); });
  document.getElementById('opt-lightscreen').addEventListener('change', e => { state.options.lightScreen = e.target.checked; renderResults(); });
  document.getElementById('opt-burned').addEventListener('change', e => { state.attacker.burned = e.target.checked; renderResults(); });

  const defStageEl = document.getElementById('def-stage');
  defStageEl.addEventListener('change', () => {
    state.options.defStage = parseInt(defStageEl.value)||0;
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
  // Update sprite
  const sprite = document.getElementById('atk-sprite');
  if (sprite) sprite.src = getSpriteUrl(state.attacker.name);
}

// ---- Render ----
function render() {
  renderTrainerNav();
  renderDefender();
  renderMonDots();
  renderResults();
}

function renderTrainerNav() {
  const trainer = currentTrainer();
  document.getElementById('trainer-name').textContent = trainer.name;
  document.getElementById('trainer-title').textContent = trainer.title + (trainer.badge ? ` — ${trainer.badge}` : '');
  document.getElementById('trainer-location').textContent = trainer.location;
  document.getElementById('trainer-counter').textContent = `${state.trainerIdx + 1} / ${trainerCount()}`;

  // Type badge
  const typeBadge = document.getElementById('trainer-type');
  typeBadge.textContent = trainer.type;
  typeBadge.style.background = TYPE_COLORS[trainer.type] || '#666';

  // Trainer list sidebar highlight
  document.querySelectorAll('.trainer-list-item').forEach((el, i) => {
    el.classList.toggle('active', i === state.trainerIdx);
  });

  // Nav button states
  document.getElementById('btn-prev-trainer').disabled = state.trainerIdx === 0;
  document.getElementById('btn-next-trainer').disabled = state.trainerIdx === trainerCount() - 1;
  document.getElementById('btn-prev-mon').disabled = (state.trainerIdx === 0 && state.monIdx === 0);
  document.getElementById('btn-next-mon').disabled = (state.trainerIdx === trainerCount()-1 && state.monIdx === monCount()-1);
}

function renderMonDots() {
  const dotsEl = document.getElementById('mon-dots');
  dotsEl.innerHTML = '';
  currentTrainer().team.forEach((mon, i) => {
    const dot = document.createElement('button');
    dot.className = 'mon-dot' + (i === state.monIdx ? ' active' : '');
    dot.title = `${mon.name} Lv.${mon.level}`;
    dot.addEventListener('click', () => goToMon(i));
    // Mini sprite
    const img = document.createElement('img');
    img.src = getSpriteUrl(mon.name);
    img.alt = mon.name;
    img.className = 'mon-dot-sprite';
    dot.appendChild(img);
    dotsEl.appendChild(dot);
  });
}

function renderDefender() {
  const mon = currentMon();
  const defStats = getStats(mon);
  const data = POKEMON_DATA[mon.name];
  const types = data ? [data[6], data[7]].filter(Boolean) : [];

  document.getElementById('def-name').textContent = mon.name.replace(/_/g, ' ');
  document.getElementById('def-level').textContent = `Lv. ${mon.level}`;
  document.getElementById('def-nature').textContent = mon.nature;
  document.getElementById('def-ability').textContent = mon.ability;
  document.getElementById('def-item').textContent = mon.item;
  document.getElementById('def-sprite').src = getSpriteUrl(mon.name);
  document.getElementById('def-mon-counter').textContent = `${state.monIdx + 1} / ${monCount()}`;

  // Types
  const typesEl = document.getElementById('def-types');
  typesEl.innerHTML = '';
  types.forEach(t => {
    const badge = document.createElement('span');
    badge.className = 'type-badge';
    badge.textContent = t;
    badge.style.background = TYPE_COLORS[t] || '#666';
    typesEl.appendChild(badge);
  });

  // Stats
  if (defStats) {
    ['hp','atk','def','spa','spd','spe'].forEach(s => {
      const el = document.getElementById(`def-stat-${s}`);
      if (el) el.textContent = defStats[s];
    });
  }

  // Moves
  const movesEl = document.getElementById('def-moves');
  movesEl.innerHTML = '';
  mon.moves.forEach(m => {
    const moveData = MOVES[m];
    const li = document.createElement('div');
    li.className = 'def-move';
    const typeTag = document.createElement('span');
    typeTag.className = 'move-type-tag';
    if (moveData) {
      typeTag.textContent = moveData[1];
      typeTag.style.background = TYPE_COLORS[moveData[1]] || '#555';
      const catTag = document.createElement('span');
      catTag.className = `move-cat move-cat-${moveData[2]}`;
      catTag.textContent = moveData[2] === 'P' ? 'Phys' : moveData[2] === 'S' ? 'Spec' : 'Stat';
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

function renderResults() {
  const resultsEl = document.getElementById('results-list');
  resultsEl.innerHTML = '';

  const attacker = state.attacker;
  const defender = currentMon();
  const atkStats = getStats(attacker);
  const defStats = getStats(defender);

  if (!atkStats || !defStats) {
    resultsEl.innerHTML = '<div class="result-empty">Unknown Pokémon — check spelling</div>';
    return;
  }

  // Update attacker display
  updateAttackerStats();

  const opts = {
    attackerItem: attacker.item,
    burned: attacker.burned,
    atkStage: attacker.atkStage,
    defStage: state.options.defStage,
    crit: state.options.crit,
    reflect: state.options.reflect,
    lightScreen: state.options.lightScreen,
  };

  let hasAnyDamage = false;

  attacker.moves.forEach(moveKey => {
    if (!moveKey || moveKey === '') return;
    const result = calcDamageRolls(attacker, atkStats, moveKey, defender, defStats, opts);
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
      card.innerHTML = `
        <div class="result-top">
          <span class="move-type-tag" style="background:${TYPE_COLORS[mType]||'#555'}">${mType}</span>
          <span class="result-move-name">${moveKey}</span>
          <span class="result-label immune-label">Immune</span>
        </div>`;
      resultsEl.appendChild(card);
      return;
    }

    hasAnyDamage = true;

    if (cat === 'X' || power <= 0) {
      card.innerHTML = `
        <div class="result-top">
          <span class="move-type-tag" style="background:${TYPE_COLORS[mType]||'#555'}">${mType}</span>
          <span class="result-move-name">${moveKey}</span>
          <span class="result-label status-label">Status</span>
        </div>`;
      resultsEl.appendChild(card);
      return;
    }

    const koLabel = getKoLabel(result);
    const effLabel = getEffectivenessLabel(result.effectiveness);
    const pctMin = result.minPct.toFixed(1);
    const pctMax = result.maxPct.toFixed(1);
    const dmgRange = `${result.min} – ${result.max} (${pctMin}% – ${pctMax}%)`;

    let koClass = '';
    if (result.ohko) koClass = 'ko-ohko';
    else if (result.twoHko) koClass = 'ko-2hko';
    else if (result.threeHko) koClass = 'ko-3hko';
    else if (koLabel.startsWith('Possible')) koClass = 'ko-possible';

    // Bar width shows max damage
    const barPct = Math.min(100, result.maxPct);
    const barMin = Math.min(100, result.minPct);

    let effClass = '';
    if (result.effectiveness > 1) effClass = 'eff-super';
    else if (result.effectiveness < 1) effClass = 'eff-not';

    card.innerHTML = `
      <div class="result-top">
        <span class="move-type-tag" style="background:${TYPE_COLORS[mType]||'#555'}">${mType}</span>
        <span class="result-move-name">${moveKey}</span>
        <span class="result-power">${power} BP</span>
        ${result.stab ? '<span class="stab-tag">STAB</span>' : ''}
        <span class="eff-tag ${effClass}">${effLabel}</span>
        ${koLabel ? `<span class="ko-tag ${koClass}">${koLabel}</span>` : ''}
      </div>
      <div class="result-dmg">${dmgRange}</div>
      <div class="result-bar-wrap">
        <div class="result-bar">
          <div class="result-bar-min" style="width:${barMin}%"></div>
          <div class="result-bar-max" style="width:${barPct}%"></div>
        </div>
      </div>
    `;
    resultsEl.appendChild(card);
  });

  if (!hasAnyDamage) {
    const empty = document.createElement('div');
    empty.className = 'result-empty';
    empty.textContent = 'Enter moves above to see damage calculations.';
    resultsEl.appendChild(empty);
  }
}

// ============================================================
// BOX IMPORT — Pokémon Showdown paste format
// ============================================================

function parseShowdownPaste(text) {
  const sets = [];
  const blocks = text.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    // First line: "Nickname (Species) @ Item" or "Species @ Item" or just "Species"
    const firstLine = lines[0];
    let rawName, item;

    const atIdx = firstLine.indexOf(' @ ');
    const namePart = atIdx !== -1 ? firstLine.slice(0, atIdx) : firstLine;
    item = atIdx !== -1 ? firstLine.slice(atIdx + 3).trim() : 'None';

    // Handle "Nickname (Species)" — extract species in parens
    const parenMatch = namePart.match(/\(([^)]+)\)\s*$/);
    rawName = parenMatch ? parenMatch[1] : namePart;
    // Strip gender markers
    rawName = rawName.replace(/\s*\([MF]\)\s*$/, '').trim();

    let ability = '', level = 50, nature = 'Hardy';
    const evs = { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 };
    const ivs = { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 };
    const moves = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('Ability:')) {
        ability = line.slice(8).trim();
      } else if (line.startsWith('Level:')) {
        level = Math.max(1, Math.min(100, parseInt(line.slice(6).trim()) || 50));
      } else if (line.startsWith('EVs:')) {
        line.slice(4).trim().split('/').forEach(part => {
          const m = part.trim().match(/^(\d+)\s+(.+)$/);
          if (!m) return;
          const v = Math.min(252, parseInt(m[1]));
          const s = m[2].trim().toLowerCase();
          if (s === 'hp')  evs.hp  = v;
          else if (s === 'atk') evs.atk = v;
          else if (s === 'def') evs.def = v;
          else if (s === 'spa' || s === 'spatkk' || s.startsWith('spa')) evs.spa = v;
          else if (s === 'spd' || s.startsWith('spd')) evs.spd = v;
          else if (s === 'spe' || s.startsWith('spe')) evs.spe = v;
        });
      } else if (line.startsWith('IVs:')) {
        line.slice(4).trim().split('/').forEach(part => {
          const m = part.trim().match(/^(\d+)\s+(.+)$/);
          if (!m) return;
          const v = Math.min(31, parseInt(m[1]));
          const s = m[2].trim().toLowerCase();
          if (s === 'hp')  ivs.hp  = v;
          else if (s === 'atk') ivs.atk = v;
          else if (s === 'def') ivs.def = v;
          else if (s === 'spa' || s.startsWith('spa')) ivs.spa = v;
          else if (s === 'spd' || s.startsWith('spd')) ivs.spd = v;
          else if (s === 'spe' || s.startsWith('spe')) ivs.spe = v;
        });
      } else if (line.endsWith(' Nature')) {
        nature = line.replace(' Nature', '').trim();
      } else if (line.startsWith('- ')) {
        if (moves.length < 4) moves.push(line.slice(2).trim());
      }
    }

    // Pad moves to 4 slots
    while (moves.length < 4) moves.push('');

    sets.push({ name: rawName, item, ability, level, nature, evs, ivs, moves });
  }

  return sets;
}

function openImportModal() {
  document.getElementById('import-modal').removeAttribute('hidden');
  document.getElementById('import-textarea').focus();
}
function closeImportModal() {
  document.getElementById('import-modal').setAttribute('hidden', '');
}

function doImport() {
  const text = document.getElementById('import-textarea').value.trim();
  if (!text) return;
  const sets = parseShowdownPaste(text);
  if (!sets.length) {
    alert('Could not parse any Pokémon. Make sure to use Pokémon Showdown export format.');
    return;
  }
  state.box = sets;
  state.boxIdx = 0;
  saveBoxToStorage();
  closeImportModal();
  loadFromBox(0);
  renderBox();
}

function loadFromBox(idx) {
  if (!state.box.length) return;
  idx = Math.max(0, Math.min(state.box.length - 1, idx));
  state.boxIdx = idx;
  const mon = state.box[idx];
  state.attacker = {
    name: mon.name,
    level: mon.level,
    nature: mon.nature,
    item: mon.item || 'None',
    ability: mon.ability || '',
    burned: false,
    atkStage: 0,
    ivs: { ...mon.ivs },
    evs: { ...mon.evs },
    moves: [...mon.moves],
  };
  syncAttackerInputsToState();
  renderBox();
  render();
}

function syncAttackerInputsToState() {
  const a = state.attacker;
  const nameEl = document.getElementById('atk-name');
  if (nameEl) nameEl.value = a.name;
  const lvEl = document.getElementById('atk-level');
  if (lvEl) lvEl.value = a.level;
  const natEl = document.getElementById('atk-nature');
  if (natEl) natEl.value = a.nature;
  const itemEl = document.getElementById('atk-item');
  if (itemEl) itemEl.value = a.item;
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`atk-move-${i}`);
    if (el) el.value = a.moves[i] || '';
  }
  ['hp','atk','def','spa','spd','spe'].forEach(s => {
    const ev = document.getElementById(`atk-ev-${s}`);
    const iv = document.getElementById(`atk-iv-${s}`);
    if (ev) ev.value = a.evs[s];
    if (iv) iv.value = a.ivs[s];
  });
  // Reset options
  document.getElementById('atk-stage').value = '0';
  document.getElementById('def-stage').value = '0';
  ['opt-crit','opt-burned','opt-reflect','opt-lightscreen'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
}

function renderBox() {
  const boxEl = document.getElementById('box-grid');
  const boxSection = document.getElementById('box-section');
  if (!state.box.length) {
    boxSection.setAttribute('hidden', '');
    return;
  }
  boxSection.removeAttribute('hidden');
  boxEl.innerHTML = '';

  state.box.forEach((mon, i) => {
    const card = document.createElement('button');
    card.className = 'box-card' + (i === state.boxIdx ? ' active' : '');
    card.title = `${mon.name} Lv.${mon.level} · ${mon.nature} · ${mon.item}`;

    const sprite = document.createElement('img');
    sprite.src = getSpriteUrl(mon.name);
    sprite.alt = mon.name;
    sprite.className = 'box-card-sprite';
    sprite.onerror = () => { sprite.style.display = 'none'; };

    const nameEl = document.createElement('div');
    nameEl.className = 'box-card-name';
    nameEl.textContent = mon.name;

    const lvEl = document.createElement('div');
    lvEl.className = 'box-card-lv';
    lvEl.textContent = `Lv.${mon.level}`;

    card.appendChild(sprite);
    card.appendChild(nameEl);
    card.appendChild(lvEl);
    card.addEventListener('click', () => loadFromBox(i));
    boxEl.appendChild(card);
  });

  // box prev/next
  document.getElementById('box-prev').disabled = state.boxIdx <= 0;
  document.getElementById('box-next').disabled = state.boxIdx >= state.box.length - 1;
  document.getElementById('box-counter').textContent = `${state.boxIdx + 1} / ${state.box.length}`;
}

function saveBoxToStorage() {
  try { localStorage.setItem('rp_box', JSON.stringify(state.box)); } catch(e) {}
}
function loadBoxFromStorage() {
  try {
    const raw = localStorage.getItem('rp_box');
    if (raw) {
      state.box = JSON.parse(raw);
      if (state.box.length) renderBox();
    }
  } catch(e) {}
}

// ---- Sidebar trainer list ----
function renderTrainerList() {
  const list = document.getElementById('trainer-list');
  list.innerHTML = '';
  TRAINERS.forEach((t, i) => {
    const item = document.createElement('button');
    item.className = 'trainer-list-item' + (i === state.trainerIdx ? ' active' : '');
    item.dataset.idx = i;
    const typeColor = TYPE_COLORS[t.type] || '#888';
    item.innerHTML = `
      <span class="tl-dot" style="background:${typeColor}"></span>
      <span class="tl-name">${t.name}</span>
      <span class="tl-badge">${t.badge || t.title}</span>
    `;
    item.addEventListener('click', () => goToTrainer(i));
    list.appendChild(item);
  });
}

// ---- Init ----
function init() {
  // Nav buttons
  document.getElementById('btn-prev-mon').addEventListener('click', prevMon);
  document.getElementById('btn-next-mon').addEventListener('click', nextMon);
  document.getElementById('btn-prev-trainer').addEventListener('click', prevTrainer);
  document.getElementById('btn-next-trainer').addEventListener('click', nextTrainer);
  document.getElementById('btn-reset').addEventListener('click', resetAttacker);

  // Import modal buttons
  document.getElementById('btn-import').addEventListener('click', openImportModal);
  document.getElementById('btn-import-cancel').addEventListener('click', closeImportModal);
  document.getElementById('btn-import-confirm').addEventListener('click', doImport);
  document.getElementById('import-modal-backdrop').addEventListener('click', closeImportModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeImportModal(); });

  // Box nav buttons
  document.getElementById('box-prev').addEventListener('click', () => loadFromBox(state.boxIdx - 1));
  document.getElementById('box-next').addEventListener('click', () => loadFromBox(state.boxIdx + 1));
  document.getElementById('btn-clear-box').addEventListener('click', () => {
    if (!state.box.length || confirm('Clear imported box?')) {
      state.box = [];
      saveBoxToStorage();
      renderBox();
    }
  });

  // Populate nature select & bind all inputs
  bindAttackerInputs();

  // Initialize attacker inputs
  document.getElementById('atk-name').value = state.attacker.name;
  document.getElementById('atk-level').value = state.attacker.level;
  document.getElementById('atk-item').value = state.attacker.item;
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`atk-move-${i}`);
    if (el) el.value = state.attacker.moves[i] || '';
  }
  ['hp','atk','def','spa','spd','spe'].forEach(s => {
    const ev = document.getElementById(`atk-ev-${s}`);
    const iv = document.getElementById(`atk-iv-${s}`);
    if (ev) ev.value = state.attacker.evs[s];
    if (iv) iv.value = state.attacker.ivs[s];
  });

  loadBoxFromStorage();
  renderTrainerList();
  render();
}

document.addEventListener('DOMContentLoaded', init);
