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

---

## ⚠️ Maintaining & updating the app — READ BEFORE EDITING

The app is built and deployed. Learner progress (streaks, card scheduling,
mastery/levels, imported cards, settings) lives **only in each phone's
`localStorage`** — there is no backend or cloud backup. Follow these rules so an
update never wipes anyone's progress.

**1. Never change the repo name or the deployed URL.**
- Progress is bound to the site *origin*: `https://erupkus.github.io/Lithuanian-English-App/`.
- Renaming the repo or moving the URL makes the browser treat it as a brand-new
  site → looks like a full reset (old data stranded at the old URL).
- The repo is **public** (free GitHub Pages). Keep it that way unless the user
  moves to a host that serves private repos.

**2. Bump the service-worker cache version on EVERY code/content edit.**
- In `service-worker.js`, increment `const CACHE = 'mokausi-anglu-vN'` (v2 → v3 …).
- Phones serve the old cached app until this changes — forget it and edits won't
  appear. This refreshes the app; it does **not** reset progress.

**3. Preserve card IDs — progress is keyed by them.**
- A card's SRS state is stored under an ID derived from its **position** in its
  unit: `js/decks.js` → `buildCurriculum()` sets `id = \`${unit.id}-${i + 1}\``.
- ✅ SAFE edits: change a card's `lt`/`en` text; append new cards to the **end**
  of a unit; add whole new units (new `unit.id`); CSS/JS changes.
- ⚠️ SCRAMBLES progress: **inserting** a card mid-unit or **reordering** cards
  (shifts every later index → ID → wrong saved state). Also: renaming a
  `unit.id`, or changing the `id` scheme. Avoid these, or accept a soft reset.
- If the user wants to freely reorder/insert, switch to **explicit stable `id`
  fields per card** (and migrate) rather than positional indices.

**4. Storage facts (don't break these).**
- Keys are namespaced per profile: `lte:profile`, `lte:{mom|dad}:cards|stats|custom|settings`.
- Imported (paste-in) cards live in `lte:{profile}:custom` — in localStorage,
  not in code — so editing `decks.js` never touches them.
- Each phone is independent by design (no sync between Mom's and Dad's devices).

**Deploy loop:** edit → bump `CACHE` → commit → push to `main` → GitHub Pages
redeploys in ~1 min. Optional robustness not yet added: `navigator.storage.persist()`
(reduce eviction risk) and an export/import-progress backup button.
