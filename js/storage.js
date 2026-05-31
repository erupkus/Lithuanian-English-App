// Per-profile persistence in localStorage. Each learner (mom / dad) keeps an
// independent namespace, so the same code runs as two separate installs without
// their progress ever mixing. No backend, no accounts — everything lives here.
import { newCardState, DAY_MS } from './srs.js';
import { isCardLearned } from './levels.js';

const NS = 'lte';
const key = (...parts) => [NS, ...parts].join(':');

function readJSON(k, fallback) {
  try {
    const raw = localStorage.getItem(k);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function writeJSON(k, value) {
  try {
    localStorage.setItem(k, JSON.stringify(value));
  } catch {
    /* quota / private mode — fail quietly, the app still works in-memory */
  }
}

function dayKey(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function defaultStats() {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastStudiedDay: null,
    reviewedToday: 0,
    dayKey: null,
    totalReviews: 0,
  };
}

let profile = null;
let state = null;

// --- profile selection -----------------------------------------------------

export function getProfile() {
  return localStorage.getItem(key('profile'));
}
export function isOnboarded() {
  return !!getProfile();
}
export function chooseProfile(p) {
  localStorage.setItem(key('profile'), p);
  return load(p);
}
// Re-pick the learner. Progress stays under its namespace, so switching back
// restores it; this only clears which learner is active on this device.
export function clearProfile() {
  localStorage.removeItem(key('profile'));
  profile = null;
  state = null;
}

// --- loading ---------------------------------------------------------------

export function load(p) {
  profile = p;
  state = {
    cards: readJSON(key(p, 'cards'), {}),
    stats: { ...defaultStats(), ...readJSON(key(p, 'stats'), {}) },
    custom: readJSON(key(p, 'custom'), []),
    settings: { sound: true, ...readJSON(key(p, 'settings'), {}) },
  };
  rolloverDay();
  return state;
}

export function getState() {
  return state;
}
export function getCustomUnits() {
  return state ? state.custom : [];
}
export function getStats() {
  return state ? state.stats : defaultStats();
}
export function getSettings() {
  return state ? state.settings : { sound: true };
}

// --- card scheduling -------------------------------------------------------

export function getCardState(id) {
  return (state.cards && state.cards[id]) || newCardState(id);
}
export function setCardState(cardState) {
  state.cards[cardState.id] = cardState;
  writeJSON(key(profile, 'cards'), state.cards);
}

export function totalLearned() {
  return Object.values(state.cards).filter(isCardLearned).length;
}

// --- daily counters & streak ----------------------------------------------

// Reset the "reviewed today" counter when the calendar day changes.
function rolloverDay(now = Date.now()) {
  const today = dayKey(now);
  if (state.stats.dayKey !== today) {
    state.stats.dayKey = today;
    state.stats.reviewedToday = 0;
    writeJSON(key(profile, 'stats'), state.stats);
  }
}

// Call once per card reviewed. Maintains the daily count and the daily streak.
export function registerStudyActivity(now = Date.now()) {
  rolloverDay(now);
  const s = state.stats;
  const today = dayKey(now);
  if (s.lastStudiedDay !== today) {
    const yesterday = dayKey(now - DAY_MS);
    s.currentStreak = s.lastStudiedDay === yesterday ? s.currentStreak + 1 : 1;
    s.lastStudiedDay = today;
    s.longestStreak = Math.max(s.longestStreak, s.currentStreak);
  }
  s.reviewedToday += 1;
  s.totalReviews += 1;
  writeJSON(key(profile, 'stats'), s);
}

// If a day was missed, the streak is stale until the next study. Surface the
// real current streak for display (0 if neither today nor yesterday was studied).
export function displayStreak(now = Date.now()) {
  const s = state.stats;
  if (!s.lastStudiedDay) return 0;
  const today = dayKey(now);
  const yesterday = dayKey(now - DAY_MS);
  if (s.lastStudiedDay === today || s.lastStudiedDay === yesterday) return s.currentStreak;
  return 0;
}

// --- custom (imported) units -----------------------------------------------

export function addCustomUnit(unit) {
  state.custom.push(unit);
  writeJSON(key(profile, 'custom'), state.custom);
}

// --- settings --------------------------------------------------------------

export function setSetting(name, value) {
  state.settings[name] = value;
  writeJSON(key(profile, 'settings'), state.settings);
}
