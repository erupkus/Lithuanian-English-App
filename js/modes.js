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

// --- fill-in-the-blank (cloze) for the typing exercise ----------------------
// Rather than typing a whole phrase, the learner types just the single key word.
// We pick the longest "content" word (skipping common filler words) and blank it
// out: "The weather is nice today" -> show "The _____ is nice today", answer
// "weather". No per-card annotation needed.

const FILLER = new Set([
  'the', 'a', 'an', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'at', 'it', 'its', 'this', 'that', 'these', 'those',
  'do', 'does', 'did', 'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your',
  'his', 'her', 'our', 'their', 'me', 'him', 'us', 'them', 'and', 'or', 'for',
  'with', 'as', 'so', 'no', 'not', 'yes', 'have', 'has', 'had', 'will', 'would',
  'can', 'could', 'should', 'may', 'might', 'how', 'what', 'where', 'when',
  'why', 'who', 'which', 'from', 'by', 'up', 'out', 'if', 'than', 'then',
]);

const clean = (tok) => tok.toLowerCase().replace(/[^a-z0-9']/g, '');
// Word length for "key word" comparison, ignoring apostrophes (so "let's" < "sleep").
const wordLen = (c) => c.replace(/'/g, '').length;

// Index of the key word to blank out: longest non-filler word; if everything is
// filler, the longest word overall.
function keyIndex(tokens) {
  let best = -1;
  let bestLen = -1;
  for (let i = 0; i < tokens.length; i++) {
    const c = clean(tokens[i]);
    if (!c || FILLER.has(c)) continue;
    if (wordLen(c) > bestLen) {
      bestLen = wordLen(c);
      best = i;
    }
  }
  if (best === -1) {
    for (let i = 0; i < tokens.length; i++) {
      const c = clean(tokens[i]);
      if (wordLen(c) > bestLen) {
        bestLen = wordLen(c);
        best = i;
      }
    }
  }
  return best;
}

// Returns { blanked, answer }. `blanked` keeps the original punctuation around
// the blank; `answer` is the bare key word to type.
export function makeCloze(en) {
  const tokens = String(en).split(/\s+/);
  const i = keyIndex(tokens);
  if (i < 0) return { blanked: en, answer: en };
  const m = tokens[i].match(/^(\W*)([\s\S]*?)(\W*)$/);
  const lead = m ? m[1] : '';
  const trail = m ? m[3] : '';
  const blanks = tokens.slice();
  blanks[i] = `${lead}_____${trail}`;
  return { blanked: blanks.join(' '), answer: clean(tokens[i]) };
}

// Correct if they typed the key word; also accept typing the full phrase.
export function checkCloze(given, answer, full) {
  const g = normalize(given);
  if (!g) return false;
  return g === normalize(answer) || g === normalize(full);
}
