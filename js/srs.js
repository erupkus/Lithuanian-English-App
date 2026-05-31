// Spaced-repetition scheduling, based on SM-2 but simplified to three ratings.
// Pure functions: given a card's state and a rating, return the next state.
// No storage or DOM coupling, so this is easy to reason about and test.

export const DAY_MS = 24 * 60 * 60 * 1000;

// Three learner-facing ratings mapped to SM-2 quality scores.
//   again = didn't know it, good = got it, easy = trivial.
export const GRADES = { again: 2, good: 4, easy: 5 };

export function newCardState(id) {
  return { id, ef: 2.5, interval: 0, reps: 0, due: 0, seen: false };
}

// Compute the next state after a review. `now` is epoch ms (injectable for tests).
export function review(state, grade, now = Date.now()) {
  const q = GRADES[grade];
  if (q == null) throw new Error(`unknown grade: ${grade}`);

  let { ef, interval, reps } = state;

  if (q < 3) {
    // Lapse: relearn from the start, show again tomorrow.
    reps = 0;
    interval = 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ef);
    reps += 1;
  }

  // Ease factor update (SM-2), floored at 1.3.
  ef = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  // "Easy" gives an extra nudge so trivial cards leave the rotation faster.
  if (grade === 'easy' && interval < 4) interval = 4;

  return {
    ...state,
    ef: Math.round(ef * 1000) / 1000,
    interval,
    reps,
    seen: true,
    due: now + interval * DAY_MS,
  };
}

export function isDue(state, now = Date.now()) {
  return !!state && state.seen && state.due <= now;
}

// Build a study session: due review cards from unlocked units, plus a few fresh
// cards from the current unit. Reviews are preserved across sessions if they
// overflow the cap; new cards are introduced gently up to the configured limit.
// Returns an ordered array of card objects ({ id, lt, en }).
export function buildSession(unlockedUnits, currentUnit, states, config, now = Date.now()) {
  const { newCards = 6, maxCards = 20 } = config || {};

  const due = [];
  for (const unit of unlockedUnits) {
    for (const card of unit.cards) {
      const s = states[card.id];
      if (isDue(s, now)) due.push({ card, due: s.due });
    }
  }
  due.sort((a, b) => a.due - b.due);

  const fresh = [];
  if (currentUnit) {
    for (const card of currentUnit.cards) {
      const s = states[card.id];
      if (!s || !s.seen) fresh.push(card);
      if (fresh.length >= newCards) break;
    }
  }

  const newTaken = fresh;
  const dueTaken = due.slice(0, Math.max(0, maxCards - newTaken.length)).map((d) => d.card);

  // New cards first (learner is freshest), then due reviews.
  return [...newTaken, ...dueTaken];
}
