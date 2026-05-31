// Controller: owns navigation, session flow, and event wiring. Renders view
// templates from ui.js into #app and reacts to [data-action] clicks via one
// delegated handler.
import { CURRICULUM, PROFILES } from './decks.js';
import {
  getUnits,
  unitStatuses,
  unlockedUnits,
  currentUnit,
  currentLevel,
  SESSION,
} from './levels.js';
import { buildSession, review, isDue } from './srs.js';
import { MODES, defaultModes, pickMode, checkAnswer } from './modes.js';
import * as store from './storage.js';
import * as speech from './speech.js';
import * as ui from './ui.js';

const APP_VERSION = '1.0.0';
const app = document.getElementById('app');

let profile = null; // 'mom' | 'dad'
let units = []; // built-in + custom units for the active profile
let session = null; // { queue, pos, revealed, reviewed, againSeen, unlockedBefore }

// --- helpers ---------------------------------------------------------------

function refreshUnits() {
  units = getUnits(profile, store.getCustomUnits());
}

function states() {
  return store.getState().cards;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Labas rytas';
  if (h < 18) return 'Laba diena';
  return 'Labas vakaras';
}

// Deterministic "phrase of the day" from the built-in deck for this profile.
function phraseOfTheDay() {
  const all = (CURRICULUM[profile] || []).flatMap((u) => u.cards);
  if (!all.length) return null;
  const now = new Date();
  const dayNum = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(2024, 0, 1)) /
      86400000,
  );
  return all[((dayNum % all.length) + all.length) % all.length];
}

function unlockedCount() {
  return unlockedUnits(units, states()).length;
}

// --- rendering -------------------------------------------------------------

function renderPicker() {
  app.innerHTML = ui.pickerView();
}

function renderHome() {
  refreshUnits();
  const cur = currentUnit(units, states());
  const stats = unitStatuses(units, states());
  const curStat = stats.find((s) => s.unit === cur) || { stats: { pct: 0 } };
  app.innerHTML = ui.homeView({
    greeting: greeting(),
    profileLabel: PROFILES[profile].label,
    streak: store.displayStreak(),
    reviewedToday: store.getStats().reviewedToday,
    totalLearned: store.totalLearned(),
    level: currentLevel(units, states()),
    levelTitle: cur ? cur.title : '—',
    levelIcon: cur ? cur.icon : '📘',
    levelPct: curStat.stats.pct,
    phrase: phraseOfTheDay(),
  });
}

function renderLevels() {
  refreshUnits();
  app.innerHTML = ui.levelsView({ statuses: unitStatuses(units, states()) });
}

function renderSettings() {
  app.innerHTML = ui.settingsView({
    profileLabel: PROFILES[profile].label,
    soundOn: store.getSettings().sound,
    modes: store.getSettings().modes || defaultModes(profile),
    speakSupported: speech.isRecognitionSupported(),
    stats: store.getStats(),
    totalLearned: store.totalLearned(),
    version: APP_VERSION,
  });
}

function renderImport() {
  app.innerHTML = ui.importView();
}

// --- session ---------------------------------------------------------------

// Enabled exercise modes for the active learner, with speaking forced off where
// recognition isn't available.
function enabledModes() {
  const m = store.getSettings().modes || defaultModes(profile);
  return {
    listen: !!m.listen,
    type: !!m.type,
    speak: !!m.speak && speech.isRecognitionSupported(),
  };
}

// Two plausible wrong Lithuanian options drawn from the rest of the deck.
function buildOptions(card) {
  const pool = units.flatMap((u) => u.cards).filter((c) => c.lt !== card.lt);
  shuffle(pool);
  const picks = [];
  const used = new Set([card.lt]);
  for (const c of pool) {
    if (picks.length >= 2) break;
    if (!used.has(c.lt)) {
      used.add(c.lt);
      picks.push(c);
    }
  }
  const options = [{ lt: card.lt, correct: true }, ...picks.map((c) => ({ lt: c.lt, correct: false }))];
  shuffle(options);
  return options;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeExercise(card) {
  const caps = { speak: speech.isRecognitionSupported() };
  let mode = pickMode(store.getCardState(card.id), enabledModes(), caps);
  const ex = { card, mode, stage: 'q' };
  if (mode === MODES.LISTEN) {
    const options = buildOptions(card);
    if (options.length < 2) {
      ex.mode = MODES.FLASH; // tiny deck — no distractors available
    } else {
      ex.options = options;
    }
  }
  return ex;
}

function startSession() {
  refreshUnits();
  const unlocked = unlockedUnits(units, states());
  const cur = currentUnit(units, states());
  const config = SESSION[profile] || SESSION.mom;
  let queue = buildSession(unlocked, cur, states(), config);

  // Fallback: nothing due and nothing new — offer light extra practice from the
  // unlocked units (earliest scheduled first) so the button always does something.
  if (!queue.length) {
    const seen = [];
    for (const unit of unlocked) {
      for (const card of unit.cards) {
        const s = states()[card.id];
        if (s && s.seen) seen.push({ card, due: s.due });
      }
    }
    seen.sort((a, b) => a.due - b.due);
    queue = seen.slice(0, config.maxCards).map((x) => x.card);
  }

  if (!queue.length) {
    renderHome();
    return;
  }

  session = { queue, pos: 0, reviewed: 0, unlockedBefore: unlockedCount(), ex: null };
  nextCard();
}

function nextCard() {
  session.ex = makeExercise(session.queue[session.pos]);
  renderExercise();
}

function renderExercise() {
  const ex = session.ex;
  app.innerHTML = ui.sessionView({ index: session.pos, total: session.queue.length, ex });
  if (ex.stage === 'q') {
    if (ex.mode === MODES.LISTEN || ex.mode === MODES.SPEAK) speech.speak(ex.card.en);
    if (ex.mode === MODES.TYPE) {
      const el = document.getElementById('type-input');
      if (el) el.focus();
    }
  }
}

function buzz() {
  if (navigator.vibrate) navigator.vibrate(25);
}

// Flashcard reveal.
function revealCard() {
  session.ex.stage = 'a';
  renderExercise();
  speech.speak(session.ex.card.en);
}

// Listening choice picked.
function chooseOption(idx) {
  const ex = session.ex;
  ex.picked = idx;
  ex.correct = !!ex.options[idx].correct;
  ex.grade = ex.correct ? 'good' : 'again';
  ex.stage = 'a';
  buzz();
  renderExercise();
}

// Typing answer checked.
function checkType() {
  const ex = session.ex;
  const el = document.getElementById('type-input');
  ex.typed = el ? el.value : '';
  ex.correct = checkAnswer(ex.typed, ex.card.en);
  ex.grade = ex.correct ? 'good' : 'again';
  ex.stage = 'a';
  buzz();
  renderExercise();
  speech.speak(ex.card.en);
}

// Speaking answer — listen via recognition, then grade.
function speakAnswer() {
  const ex = session.ex;
  ex.recognizing = true;
  ex.error = null;
  renderExercise();
  speech
    .recognize()
    .then((transcript) => {
      ex.transcript = transcript;
      ex.correct = checkAnswer(transcript, ex.card.en);
      ex.grade = ex.correct ? 'good' : 'again';
      ex.recognizing = false;
      ex.stage = 'a';
      buzz();
      renderExercise();
    })
    .catch(() => {
      ex.recognizing = false;
      ex.error = 'Nepavyko išgirsti. Bandyk dar arba praleisk.';
      renderExercise();
    });
}

// Manual override when recognition got it wrong but the learner said it right.
function overrideCorrect() {
  session.ex.correct = true;
  session.ex.grade = 'good';
  renderExercise();
}

// Apply the (computed or chosen) grade and move on.
function advance() {
  applyGrade(session.ex.grade || 'good');
}

// Skip the current card without grading (it stays due for next time). Used when
// speech recognition can't run (e.g. offline).
function skipCard() {
  session.pos += 1;
  session.ex = null;
  if (session.pos >= session.queue.length) finishSession();
  else nextCard();
}

function applyGrade(grade) {
  const card = session.queue[session.pos];
  store.setCardState(review(store.getCardState(card.id), grade));
  store.registerStudyActivity();
  session.reviewed += 1;

  // "Again" → show it once more later in this same session.
  if (grade === 'again' && session.queue.length < 40) session.queue.push(card);

  session.pos += 1;
  session.ex = null;

  if (session.pos >= session.queue.length) finishSession();
  else nextCard();
}

// Flashcard self-rating both grades and advances.
function rateCard(grade) {
  buzz();
  applyGrade(grade);
}

function finishSession() {
  refreshUnits();
  // Did a new unit unlock during this session?
  const statuses = unitStatuses(units, states());
  let unlockedTitle = null;
  if (unlockedCount() > session.unlockedBefore) {
    const firstCurrent = statuses.find((s) => s.status === 'current');
    if (firstCurrent) unlockedTitle = firstCurrent.unit.title;
  }
  const count = session.reviewed;
  session = null;
  app.innerHTML = ui.doneView({
    count,
    streak: store.displayStreak(),
    unlockedTitle,
  });
}

// --- import ----------------------------------------------------------------

// Accepts "lt = en" lines (also tab / | / " - " separated) or a JSON array of
// [lt, en] pairs / {lt, en} objects.
function parseImport(text) {
  const trimmed = text.trim();
  const pairs = [];
  if (trimmed.startsWith('[')) {
    try {
      for (const item of JSON.parse(trimmed)) {
        if (Array.isArray(item) && item.length >= 2) pairs.push([item[0], item[1]]);
        else if (item && item.lt && item.en) pairs.push([item.lt, item.en]);
      }
    } catch {
      /* fall through to line parsing */
    }
  }
  if (!pairs.length) {
    for (const line of trimmed.split(/\r?\n/)) {
      const m = line.match(/^(.*?)\s*(?:=|\t|\||\s-\s)\s*(.*)$/);
      if (m && m[1].trim() && m[2].trim()) pairs.push([m[1].trim(), m[2].trim()]);
    }
  }
  return pairs
    .map(([lt, en]) => ({ lt: String(lt).trim(), en: String(en).trim() }))
    .filter((c) => c.lt && c.en);
}

function submitImport() {
  const titleEl = document.getElementById('import-title');
  const textEl = document.getElementById('import-text');
  const msgEl = document.getElementById('import-msg');
  const cards = parseImport(textEl.value || '');
  if (!cards.length) {
    msgEl.textContent = 'Nepavyko atpažinti kortelių. Naudokite: lietuviškai = angliškai';
    msgEl.className = 'import__msg import__msg--err';
    return;
  }
  const id = `custom-${Date.now()}`;
  store.addCustomUnit({
    id,
    title: (titleEl.value || '').trim() || 'Mano kortelės',
    icon: '⭐',
    custom: true,
    cards: cards.map((c, i) => ({ id: `${id}-${i + 1}`, lt: c.lt, en: c.en })),
  });
  refreshUnits();
  renderHome();
}

// --- profile / settings actions -------------------------------------------

function ensureModes() {
  if (!store.getSettings().modes) store.setSetting('modes', defaultModes(profile));
}

function chooseProfile(p) {
  profile = p;
  store.chooseProfile(p);
  ensureModes();
  refreshUnits();
  renderHome();
}

function toggleSound() {
  const next = !store.getSettings().sound;
  store.setSetting('sound', next);
  speech.setEnabled(next);
  renderSettings();
}

function toggleMode(mode) {
  const modes = { ...(store.getSettings().modes || defaultModes(profile)) };
  modes[mode] = !modes[mode];
  store.setSetting('modes', modes);
  renderSettings();
}

function resetProfile() {
  store.clearProfile();
  profile = null;
  renderPicker();
}

// --- event delegation ------------------------------------------------------

const actions = {
  'choose-profile': (el) => chooseProfile(el.dataset.profile),
  'start-session': () => startSession(),
  'go-home': () => renderHome(),
  'go-levels': () => renderLevels(),
  'go-settings': () => renderSettings(),
  'go-import': () => renderImport(),
  reveal: () => revealCard(),
  rate: (el) => rateCard(el.dataset.grade),
  choose: (el) => chooseOption(Number(el.dataset.idx)),
  'check-type': () => checkType(),
  'speak-answer': () => speakAnswer(),
  'override-correct': () => overrideCorrect(),
  advance: () => advance(),
  skip: () => skipCard(),
  speak: (el) => speech.speak(el.dataset.text),
  'toggle-sound': () => toggleSound(),
  'toggle-mode': (el) => toggleMode(el.dataset.mode),
  'reset-profile': () => resetProfile(),
  'import-submit': () => submitImport(),
};

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) {
    e.preventDefault();
    fn(el);
  }
});

// Enter submits the typing exercise.
app.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'type-input') {
    e.preventDefault();
    if (session && session.ex && session.ex.mode === 'type' && session.ex.stage === 'q') checkType();
  }
});

// --- boot ------------------------------------------------------------------

function boot() {
  speech.initSpeech();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    });
  }

  if (store.isOnboarded()) {
    profile = store.getProfile();
    store.load(profile);
    ensureModes();
    speech.setEnabled(store.getSettings().sound);
    refreshUnits();
    renderHome();
  } else {
    renderPicker();
  }
}

boot();
