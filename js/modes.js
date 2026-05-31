// Exercise modes. The same card is practised different ways depending on how
// well it's known (its SRS maturity) and which modes the learner has enabled:
//   flash  — tap to reveal, self-rate (always available; only mode for new cards)
//   listen — hear the English, pick the Lithuanian meaning
//   type   — type the English for the Lithuanian prompt
//   speak  — say the English aloud (needs speech recognition + internet)
// This makes practice "depend on the level": new = recognise, mature = produce.

export const MODES = { FLASH: 'flash', LISTEN: 'listen', TYPE: 'type', SPEAK: 'speak' };

// Per-track defaults. Dad (true beginner) stays gentle; Mom gets production too.
export function defaultModes(track) {
  return track === 'mom'
    ? { listen: true, type: true, speak: false }
    : { listen: true, type: false, speak: false };
}

// Choose how to practise a card this time. Deterministic from the card's rep
// count so it feels varied but stable, with a flashcard "breather" periodically.
// `caps` lets the caller forbid modes that can't run right now (e.g. speak when
// recognition is unsupported, or listen when there aren't enough distractors).
export function pickMode(cardState, enabled, caps = {}) {
  const reps = cardState ? cardState.reps : 0;
  if (!cardState || !cardState.seen || reps === 0) return MODES.FLASH;

  // A gentle flashcard "breather" every 4th rep.
  if (reps % 4 === 0) return MODES.FLASH;

  const canListen = enabled.listen && caps.listen !== false;
  const canType = enabled.type;
  const canSpeak = enabled.speak && caps.speak !== false;

  // Step up the ladder with maturity (recognise → produce → speak), falling
  // back down whenever the higher mode is disabled or unavailable.
  if (reps >= 3) return canSpeak ? MODES.SPEAK : canType ? MODES.TYPE : canListen ? MODES.LISTEN : MODES.FLASH;
  if (reps === 2) return canType ? MODES.TYPE : canListen ? MODES.LISTEN : MODES.FLASH;
  return canListen ? MODES.LISTEN : MODES.FLASH; // reps === 1
}

// Lenient comparison for typed/spoken answers: case-, punctuation- and
// whitespace-insensitive.
export function normalize(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function checkAnswer(given, expected) {
  const g = normalize(given);
  const e = normalize(expected);
  if (!g) return false;
  // exact (normalized) match, or the spoken phrase contains the target / vice
  // versa — recognition often adds or drops a small word.
  return g === e || g.includes(e) || e.includes(g);
}
