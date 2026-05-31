// Text-to-speech via the Web Speech API. The English side of every card is read
// aloud — hearing the language is central to the learners' comprehension goal.
// Voices load asynchronously on many devices, so we resolve them lazily and
// degrade gracefully (a silent no-op) where speech isn't available.

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
let voice = null;
let enabled = true;

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const byLang = (prefix) =>
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix));
  return byLang('en-us') || byLang('en-gb') || byLang('en') || null;
}

export function initSpeech() {
  if (!supported) return;
  voice = pickVoice();
  if (!voice) {
    // Voices populate after a 'voiceschanged' event on Chrome/Android.
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      voice = pickVoice();
    });
  }
}

export function isSupported() {
  return supported;
}

export function setEnabled(value) {
  enabled = value;
  if (!value) cancel();
}

export function speak(text) {
  if (!supported || !enabled || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = 'en-US';
    }
    u.rate = 0.85; // a touch slower, easier to follow for beginners
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore — speech is a nice-to-have, never blocks the UI */
  }
}

export function cancel() {
  if (!supported) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

// --- speech recognition (for the optional speaking exercise) ----------------
// Note: on Android Chrome this uses Google's servers, so it needs internet and
// can misfire on strong accents — callers always offer a manual override.

const Recognition =
  typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

export function isRecognitionSupported() {
  return !!Recognition;
}

// Resolve with the recognised transcript, or reject on error / no support.
export function recognize() {
  return new Promise((resolve, reject) => {
    if (!Recognition) {
      reject(new Error('unsupported'));
      return;
    }
    try {
      cancel(); // don't let TTS overlap the microphone
      const rec = new Recognition();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      let done = false;
      rec.onresult = (e) => {
        done = true;
        resolve(e.results[0][0].transcript);
      };
      rec.onerror = (e) => reject(new Error(e.error || 'error'));
      rec.onend = () => {
        if (!done) reject(new Error('no-speech'));
      };
      rec.start();
    } catch (err) {
      reject(err);
    }
  });
}
