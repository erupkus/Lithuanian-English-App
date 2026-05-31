// Unit / level progression. Cards live in ordered themed units (decks.js).
// A unit is "mastered" once enough of its cards reach a graduated interval; the
// next unit unlocks only then. This gives a calm, visible sense of levelling up
// without any gamified pressure.
import { CURRICULUM } from './decks.js';

// A card counts as "learned" once its SRS interval reaches a week — it has stuck.
export const GRADUATED_INTERVAL_DAYS = 7;
// A unit is mastered when this fraction of its cards are learned.
export const UNIT_MASTERY_THRESHOLD = 0.8;

// Session sizing — Dad gets shorter, lower-pressure sessions (per the brief).
export const SESSION = {
  dad: { newCards: 4, maxCards: 12 },
  mom: { newCards: 7, maxCards: 20 },
};

// Built-in units for a track, followed by any user-imported custom units.
export function getUnits(track, customUnits = []) {
  return [...(CURRICULUM[track] || []), ...customUnits];
}

export function isCardLearned(state) {
  return !!state && state.interval >= GRADUATED_INTERVAL_DAYS;
}

export function unitStats(unit, states) {
  let learned = 0;
  let seen = 0;
  for (const c of unit.cards) {
    const s = states[c.id];
    if (s && s.seen) seen++;
    if (isCardLearned(s)) learned++;
  }
  const total = unit.cards.length;
  return { total, seen, learned, pct: total ? learned / total : 0 };
}

export function isUnitMastered(unit, states) {
  return unitStats(unit, states).pct >= UNIT_MASTERY_THRESHOLD;
}

// Status for each unit: 'done' (mastered), 'current' (unlocked, in progress),
// or 'locked'. A unit unlocks only once every earlier unit is mastered.
export function unitStatuses(units, states) {
  const result = [];
  let prevMastered = true;
  for (const unit of units) {
    const unlocked = prevMastered;
    const mastered = isUnitMastered(unit, states);
    const status = !unlocked ? 'locked' : mastered ? 'done' : 'current';
    result.push({ unit, status, stats: unitStats(unit, states) });
    prevMastered = unlocked && mastered;
  }
  return result;
}

export function unlockedUnits(units, states) {
  return unitStatuses(units, states)
    .filter((s) => s.status !== 'locked')
    .map((s) => s.unit);
}

// The unit the learner is actively working on (first unlocked, not-yet-mastered).
// If everything is mastered, returns the last unit so new content still flows.
export function currentUnit(units, states) {
  const statuses = unitStatuses(units, states);
  const current = statuses.find((s) => s.status === 'current');
  if (current) return current.unit;
  return units.length ? units[units.length - 1] : null;
}

// 1-based level number = index of the current unit.
export function currentLevel(units, states) {
  const cur = currentUnit(units, states);
  const idx = units.findIndex((u) => u.id === (cur && cur.id));
  return idx >= 0 ? idx + 1 : 1;
}
