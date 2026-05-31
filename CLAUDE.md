# Project Context: Lithuanian Parents English Learning App

## What this project is

A Progressive Web App (PWA) for two Lithuanian-speaking adults learning English. It lives on their Android phones, installed via "Add to Home Screen" — no Play Store, no account, no ongoing cost.

This is Part 2 of a two-part initiative. Part 1 is already complete: two Claude Projects (one per parent) with custom system prompts that act as personalized AI English tutors with session memory. This PWA is the daily habit layer — short, structured practice they can do independently, offline, any time.

---

## The learners

**Mom**
- Has Duolingo background — basic vocabulary established
- Understands words and simple phrases, struggles to construct full sentences
- Comprehension is ahead of speaking ability
- Goal: conversational English, understanding natural speech

**Dad**
- True beginner — knows only a handful of words
- May understand more than he shows (passive comprehension suspected)
- Goal: same as mom, but starting from scratch
- Needs more encouragement, shorter sessions, less pressure to produce output

Both are comfortable with technology and own Android phones.

---

## What the PWA should do

### Core features
- **Spaced repetition flashcards** — Lithuanian → English, phrase-level (not just single words). Uses a simple SRS algorithm (e.g. SM-2 or a basic interval system). Cards should reflect real-life scenarios: greetings, shopping, family, medical, numbers, directions.
- **Text-to-speech on every card** — English side is always read aloud automatically using the Web Speech API. Hearing the language is critical for their comprehension goal.
- **Separate decks per user** — Dad starts with absolute beginner cards, Mom starts at a slightly higher level. They should each have their own profile/progress on the same device, or ideally the app works well as two separate installs (one per phone).
- **Streak and progress tracker** — simple daily habit mechanic. Show current streak, cards reviewed today, total learned. Nothing complex.
- **Offline support** — full functionality without internet via service worker caching.

### Nice to have (implement if straightforward)
- A "too easy / too hard" rating on each card to adjust intervals
- A small "phrase of the day" shown on the home screen
- Haptic feedback on correct answers (mobile feel)

### Explicitly out of scope
- No backend, no server, no database — everything in localStorage
- No login or accounts
- No AI/API calls — this is static and free to run forever
- No complex animations or heavy UI frameworks — keep it fast and simple

---

## Technical notes

- **Platform:** Android phones, Chrome browser, installed as PWA
- **Stack:** Plain HTML, CSS, JavaScript preferred. A lightweight framework (e.g. Preact, Alpine.js) is fine if it meaningfully simplifies the code. No React, no build pipeline if avoidable — this should be easy to maintain.
- **Storage:** localStorage for progress, streaks, card intervals
- **Speech:** Web Speech API (`speechSynthesis`) for TTS — no external service
- **PWA requirements:** manifest.json, service worker, installable on Android Chrome
- **Single codebase** — both parent profiles live in the same app; a simple profile selector on first launch is enough

---

## Tone and UX

- UI must be usable by someone with little English — icons over words where possible, Lithuanian labels for navigation
- Large touch targets (they're on phones)
- Warm, encouraging feel — not clinical or gamified to an annoying degree
- Duolingo already covers the gamification angle; this should feel calmer and more focused

---

## What's already built

- `english_tutor_prompt.md` — Claude Project instructions for Mom's AI tutor
- `english_tutor_prompt_dad.md` — Claude Project instructions for Dad's AI tutor

Both prompts include session memory via a Learner Profile block that gets updated at the end of each session, and instructions for Claude to naturally introduce Android's text-to-speech and voice-to-text features during sessions.

---

## First task for Claude Code

Build the PWA. Start with:
1. Project structure and manifest
2. The flashcard SRS engine (data + algorithm)
3. A working card UI with TTS
4. Profile selector (Mom / Dad)
5. Then streak tracking, offline support, and polish

Ask clarifying questions before writing code if anything above is ambiguous.
