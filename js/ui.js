// View templates. Each function returns an HTML string for a screen; app.js
// renders it and wires up clicks via [data-action] delegation. Labels are in
// Lithuanian with icons throughout, per the brief (usable with little English).

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function pickerView() {
  return `
    <section class="view picker">
      <h1 class="picker__title">Mokausi anglų</h1>
      <p class="picker__subtitle">Kas mokosi?</p>
      <div class="picker__choices">
        <button class="profile-btn" data-action="choose-profile" data-profile="mom">
          <span class="profile-btn__emoji">👩</span>
          <span class="profile-btn__label">Mama</span>
        </button>
        <button class="profile-btn" data-action="choose-profile" data-profile="dad">
          <span class="profile-btn__emoji">👨</span>
          <span class="profile-btn__label">Tėtis</span>
        </button>
      </div>
      <p class="picker__hint">Pasirinkimą galėsite pakeisti nustatymuose.</p>
    </section>`;
}

export function homeView(d) {
  const phrase = d.phrase
    ? `<div class="phrase" data-action="speak" data-text="${escapeHtml(d.phrase.en)}">
         <div class="phrase__label">Dienos frazė 🔊</div>
         <div class="phrase__lt">${escapeHtml(d.phrase.lt)}</div>
         <div class="phrase__en">${escapeHtml(d.phrase.en)}</div>
       </div>`
    : '';
  return `
    <section class="view home">
      <header class="home__top">
        <div class="streak" title="Dienų iš eilės">🔥 <strong>${d.streak}</strong></div>
        <button class="icon-btn" data-action="go-settings" aria-label="Nustatymai">⚙️</button>
      </header>

      <div class="home__greeting">${escapeHtml(d.greeting)}, ${escapeHtml(d.profileLabel)}!</div>

      <div class="stats-row">
        <div class="stat"><div class="stat__num">${d.reviewedToday}</div><div class="stat__lbl">šiandien</div></div>
        <div class="stat"><div class="stat__num">${d.totalLearned}</div><div class="stat__lbl">išmokta</div></div>
        <div class="stat"><div class="stat__num">${d.level}</div><div class="stat__lbl">lygis</div></div>
      </div>

      <div class="level-card" data-action="go-levels">
        <div class="level-card__head">
          <span>${d.levelIcon} ${escapeHtml(d.levelTitle)}</span>
          <span class="level-card__pct">${Math.round(d.levelPct * 100)}%</span>
        </div>
        <div class="bar"><div class="bar__fill" style="width:${Math.round(d.levelPct * 100)}%"></div></div>
      </div>

      ${phrase}

      <button class="primary-btn" data-action="start-session">▶ Mokytis</button>
      <button class="ghost-btn" data-action="go-levels">📚 Lygiai</button>
    </section>`;
}

export function levelsView(d) {
  const items = d.statuses
    .map(({ unit, status, stats }) => {
      const badge =
        status === 'done'
          ? '<span class="unit__badge unit__badge--done">✓</span>'
          : status === 'locked'
            ? '<span class="unit__badge unit__badge--locked">🔒</span>'
            : `<span class="unit__badge">${stats.learned}/${stats.total}</span>`;
      const pct = Math.round(stats.pct * 100);
      return `
        <li class="unit unit--${status}">
          <span class="unit__icon">${unit.icon || '📘'}</span>
          <span class="unit__body">
            <span class="unit__title">${escapeHtml(unit.title)}</span>
            <span class="bar bar--sm"><span class="bar__fill" style="width:${pct}%"></span></span>
          </span>
          ${badge}
        </li>`;
    })
    .join('');
  return `
    <section class="view levels">
      <header class="subhead">
        <button class="icon-btn" data-action="go-home" aria-label="Atgal">←</button>
        <h2>Lygiai</h2>
      </header>
      <ul class="unit-list">${items}</ul>
    </section>`;
}

export function sessionView(d) {
  const pct = d.total ? Math.round((d.index / d.total) * 100) : 0;
  const bodies = {
    flash: flashBody,
    listen: listenBody,
    type: typeBody,
    speak: speakBody,
  };
  const { card, body, footer } = (bodies[d.ex.mode] || flashBody)(d.ex);
  return `
    <section class="view session">
      <header class="session__top">
        <button class="icon-btn" data-action="go-home" aria-label="Baigti">✕</button>
        <div class="bar bar--session"><div class="bar__fill" style="width:${pct}%"></div></div>
        <div class="session__count">${d.index + 1}/${d.total}</div>
      </header>
      ${card}
      ${footer}
    </section>`;
}

const speakBtn = (text) =>
  `<button class="speak-btn" data-action="speak" data-text="${escapeHtml(text)}" aria-label="Klausyti">🔊</button>`;

const continueFooter = `<div class="ratings"><button class="primary-btn" data-action="advance">Toliau →</button></div>`;

function resultMark(ok) {
  return ok
    ? '<div class="result result--ok">✓ Teisingai!</div>'
    : '<div class="result result--no">✗ Beveik</div>';
}

// --- flashcard (tap to reveal, self-rate) ---
function flashBody(ex) {
  if (ex.stage !== 'a') {
    return {
      card: `<div class="card" data-action="reveal">
               <div class="card__lt">${escapeHtml(ex.card.lt)}</div>
               <div class="card__hint">Palieskite, kad pamatytumėte 👆</div>
             </div>`,
      footer: `<div class="ratings ratings--hint">Pasiklausykite ir pasitikrinkite</div>`,
    };
  }
  return {
    card: `<div class="card card--revealed">
             <div class="card__lt card__lt--sm">${escapeHtml(ex.card.lt)}</div>
             <div class="card__en">${escapeHtml(ex.card.en)}</div>
             ${speakBtn(ex.card.en)}
           </div>`,
    footer: `<div class="ratings">
        <button class="rate rate--again" data-action="rate" data-grade="again"><span>🔁</span><small>Dar kartą</small></button>
        <button class="rate rate--good" data-action="rate" data-grade="good"><span>🙂</span><small>Gerai</small></button>
        <button class="rate rate--easy" data-action="rate" data-grade="easy"><span>😎</span><small>Lengva</small></button>
      </div>`,
  };
}

// --- listening multiple choice (hear English, pick the Lithuanian) ---
function listenBody(ex) {
  const opts = ex.options
    .map((o, i) => {
      let cls = 'choice';
      if (ex.stage === 'a') {
        if (o.correct) cls += ' choice--correct';
        else if (i === ex.picked) cls += ' choice--wrong';
      }
      const attr = ex.stage === 'a' ? '' : `data-action="choose" data-idx="${i}"`;
      return `<button class="${cls}" ${attr}>${escapeHtml(o.lt)}</button>`;
    })
    .join('');
  const reveal =
    ex.stage === 'a'
      ? `${resultMark(ex.correct)}<div class="card__en card__en--sm">${escapeHtml(ex.card.en)}</div>`
      : '<div class="card__hint">Klausyk ir pasirink 👂</div>';
  return {
    card: `<div class="card card--listen">
             <button class="speak-btn speak-btn--lg" data-action="speak" data-text="${escapeHtml(ex.card.en)}" aria-label="Klausyti">🔊</button>
             ${reveal}
             <div class="choices">${opts}</div>
           </div>`,
    footer: ex.stage === 'a' ? continueFooter : '<div class="ratings ratings--hint">Bakstelėk 🔊, kad išgirstum dar kartą</div>',
  };
}

// --- typing (type the English) ---
function typeBody(ex) {
  if (ex.stage !== 'a') {
    return {
      card: `<div class="card card--type">
               <div class="card__lt card__lt--sm">Parašyk angliškai:</div>
               <div class="card__lt">${escapeHtml(ex.card.lt)}</div>
               <input class="type-input" id="type-input" type="text" autocomplete="off"
                      autocapitalize="off" autocorrect="off" spellcheck="false"
                      placeholder="anglų kalba..." />
             </div>`,
      footer: `<div class="ratings"><button class="primary-btn" data-action="check-type">Tikrinti</button></div>`,
    };
  }
  const yours =
    !ex.correct && ex.typed
      ? `<div class="type-yours">Tu parašei: <s>${escapeHtml(ex.typed)}</s></div>`
      : '';
  return {
    card: `<div class="card card--type card--revealed">
             <div class="card__lt card__lt--sm">${escapeHtml(ex.card.lt)}</div>
             ${resultMark(ex.correct)}
             <div class="card__en">${escapeHtml(ex.card.en)}</div>
             ${speakBtn(ex.card.en)}
             ${yours}
           </div>`,
    footer: continueFooter,
  };
}

// --- speaking (say the English aloud) ---
function speakBody(ex) {
  if (ex.stage !== 'a') {
    const mic = ex.recognizing
      ? `<button class="speak-btn speak-btn--lg speak-btn--live" disabled>🎙️</button><div class="card__hint">Klausausi… sakyk dabar</div>`
      : `<button class="speak-btn speak-btn--lg" data-action="speak-answer" aria-label="Sakyti">🎤</button><div class="card__hint">Bakstelėk ir pasakyk angliškai</div>`;
    const err = ex.error ? `<div class="result result--no">${escapeHtml(ex.error)}</div>` : '';
    return {
      card: `<div class="card card--speak">
               <div class="card__lt card__lt--sm">${escapeHtml(ex.card.lt)}</div>
               <div class="card__en card__en--sm">${escapeHtml(ex.card.en)}</div>
               ${speakBtn(ex.card.en)}
               ${mic}
               ${err}
             </div>`,
      footer: `<div class="ratings ratings--col">
                 <button class="ghost-btn" data-action="skip">Praleisti šią →</button>
               </div>`,
    };
  }
  const heard = ex.transcript
    ? `<div class="type-yours">Išgirdau: „${escapeHtml(ex.transcript)}“</div>`
    : '';
  const override = !ex.correct
    ? `<button class="ghost-btn" data-action="override-correct">Sakiau teisingai ✓</button>`
    : '';
  return {
    card: `<div class="card card--speak card--revealed">
             <div class="card__lt card__lt--sm">${escapeHtml(ex.card.lt)}</div>
             ${resultMark(ex.correct)}
             <div class="card__en">${escapeHtml(ex.card.en)}</div>
             ${speakBtn(ex.card.en)}
             ${heard}
           </div>`,
    footer: `<div class="ratings ratings--col">${override}<button class="primary-btn" data-action="advance">Toliau →</button></div>`,
  };
}

export function doneView(d) {
  const unlocked = d.unlockedTitle
    ? `<p class="done__unlock">🎉 Atrakinai naują lygį:<br><strong>${escapeHtml(d.unlockedTitle)}</strong></p>`
    : '';
  return `
    <section class="view done">
      <div class="done__emoji">🌟</div>
      <h2 class="done__title">Šaunu!</h2>
      <p class="done__summary">Pakartojai <strong>${d.count}</strong> ${d.count === 1 ? 'kortelę' : 'korteles'}.</p>
      <p class="done__streak">🔥 ${d.streak} ${d.streak === 1 ? 'diena' : 'dienos'} iš eilės</p>
      ${unlocked}
      <button class="primary-btn" data-action="go-home">Į pradžią</button>
    </section>`;
}

export function settingsView(d) {
  return `
    <section class="view settings">
      <header class="subhead">
        <button class="icon-btn" data-action="go-home" aria-label="Atgal">←</button>
        <h2>Nustatymai</h2>
      </header>

      <div class="setting-row">
        <span>Mokinys</span>
        <strong>${escapeHtml(d.profileLabel)}</strong>
      </div>

      <div class="setting-row">
        <span>Garsas 🔊</span>
        <button class="toggle ${d.soundOn ? 'toggle--on' : ''}" data-action="toggle-sound" role="switch" aria-checked="${d.soundOn}">
          <span class="toggle__knob"></span>
        </button>
      </div>

      <div class="setting-group__label">Užduočių tipai</div>
      ${modeToggle('listen', '👂 Klausymas', d.modes.listen, true)}
      ${modeToggle('type', '⌨️ Rašymas', d.modes.type, true)}
      ${modeToggle('speak', '🎤 Kalbėjimas', d.modes.speak, d.speakSupported, 'reikia interneto')}

      <div class="totals">
        <div class="total"><span>${d.stats.currentStreak}</span><small>serija dabar</small></div>
        <div class="total"><span>${d.stats.longestStreak}</span><small>ilgiausia serija</small></div>
        <div class="total"><span>${d.totalLearned}</span><small>išmokta</small></div>
        <div class="total"><span>${d.stats.totalReviews}</span><small>kartojimų</small></div>
      </div>

      <button class="ghost-btn" data-action="go-import">➕ Pridėti korteles</button>
      <button class="ghost-btn ghost-btn--warn" data-action="reset-profile">🔄 Keisti mokinį</button>

      <p class="settings__version">v${d.version}</p>
    </section>`;
}

function modeToggle(mode, label, on, supported, note) {
  if (!supported) {
    return `<div class="setting-row setting-row--off">
              <span>${label}<small> · negalima šiame įrenginyje</small></span>
              <button class="toggle" disabled><span class="toggle__knob"></span></button>
            </div>`;
  }
  const sub = note ? `<small> · ${note}</small>` : '';
  return `<div class="setting-row">
            <span>${label}${sub}</span>
            <button class="toggle ${on ? 'toggle--on' : ''}" data-action="toggle-mode" data-mode="${mode}" role="switch" aria-checked="${on}">
              <span class="toggle__knob"></span>
            </button>
          </div>`;
}

export function importView() {
  return `
    <section class="view import">
      <header class="subhead">
        <button class="icon-btn" data-action="go-settings" aria-label="Atgal">←</button>
        <h2>Pridėti korteles</h2>
      </header>
      <p class="import__help">
        Vienoje eilutėje: <code>lietuviškai = angliškai</code><br>
        Pvz.: <code>Geros dienos = Have a nice day</code>
      </p>
      <input class="import__title" id="import-title" type="text" placeholder="Rinkinio pavadinimas (nebūtina)" />
      <textarea class="import__text" id="import-text" rows="8" placeholder="Labas = Hello&#10;Ačiū = Thank you"></textarea>
      <div class="import__msg" id="import-msg"></div>
      <button class="primary-btn" data-action="import-submit">Išsaugoti</button>
    </section>`;
}
