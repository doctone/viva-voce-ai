---
target: submission/id page
total_score: 17
max_score: 40
na_heuristics: 
p0_count: 3
p1_count: 2
timestamp: 2026-07-30T21-11-08Z
slug: web-src-routes-authed-submissions-submissionid-tsx
---
Method: dual-agent (A: a5b42b09441ed1224 · B: a8660ca19bf717f8b)

Target: `apps/web/src/routes/_authed/submissions.$submissionId.tsx` + the five `-` panels it composes. Mode: **Operate**. Source-only — no viva-voce-ai dev server was running, so no browser overlay was produced.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Autosave reports "Saved" while text is unsaved (`-VivaSessionCapturePanel.tsx:95-98, 180-182`); generation progress is fabricated (`:578-600`) |
| 2 | Match System / Real World | 3 | Strong teacher vocabulary, but the student is a raw DB id — "Student {student_id}" (`:1031, :1092`) |
| 3 | User Control and Freedom | 1 | No undo on Remove; Cancel wipes the readiness form; generation auto-fires on mount; tab state is local `defaultValue` (`:1036`) so Back/refresh discard it |
| 4 | Consistency and Standards | 2 | Three input vocabularies on one page: `fieldControlClassName`, raw `border p-2` textareas, unstyled native file input (`:1223`) |
| 5 | Error Prevention | 1 | The wrong-student safeguard can't be performed by a human (`-VivaSessionReadinessPanel.tsx:196-198`); Remove sits 4px from Move down with no confirm |
| 6 | Recognition Rather Than Recall | 2 | Selected questions render twice (left list + right rail) with no shared numbering; two different "expected duration" figures |
| 7 | Flexibility and Efficiency | 1 | Move-up/move-down only, each click rewrites every position + full refetch (`:809-823`); no bulk add; page opens on the tab with no work in it |
| 8 | Aesthetic and Minimalist Design | 2 | Right rail runs four unrelated jobs at once (`:1140-1294`); "Document Statistics" is filler; loading screen out-designs the working screen |
| 9 | Error Recovery | 2 | Error copy is genuinely excellent, but three error screens offer no retry and no exit (`:934-947, :949-962, :998-1011`) |
| 10 | Help and Documentation | 1 | "Category balance" gives counts with no target; nothing states what "Start Viva Session" actually does |
| **Total** | | **17/40** | **Poor — major UX work needed before this is safe to use on a real student** |

## Design Specificity Verdict

**LLM assessment: roughly 80% category-interchangeable.** Swap six nouns and this is a Jira sprint planner. The composition is the stock SaaS arrangement — tab bar, scrolling card list left, sticky config rail right, hover-revealed row actions, checkbox multi-select, move-up/move-down/remove text links, a stats card.

The "Document Statistics" panel (`:1076-1104`) is the tell. "Word Count / Student / Questions Generated" is a KPI block, and "Questions Generated" measures the *system's* productivity, not anything a teacher decides on. DESIGN.md line 188 bans exactly this.

The generation screen (`:485-607`) is the most designed thing here and the most generic: three fabricated progress steps with `animate-pulse` numbered circles (`:589`), a pulsing `animate-ping` dot (`:517-524`), `rounded-full` skeleton bars (`:473`), a background gradient (`:527`). Square corners are this system's single most distinctive rule (`rounded: {}`, DESIGN.md 152) and this screen breaks it four times. PRODUCT.md principle 1 says "over speed theatrics"; this is speed theatrics rendered literally.

**What is genuinely authored for this product:** the serif reading column (`:1059-1066`), the readiness checklist with consent and a decline reason, the three-category question balance, private teacher notes, the Stage 1/2/3 spine. That is real domain thinking.

**The missed opportunity is the whole product.** The student's submission and the questions about it live in *different tabs* (`:1056` vs `:1110`). A viva interrogates specific claims in a specific text — and this page makes it structurally impossible to see the claim and the question about the claim together. No anchors, no passage references. The one composition only a viva tool could have is the one this page forbids.

**Deterministic scan:** `detect.mjs` returned exit 0 on the route file and exit 2 on the directory — **1 finding**, rule `side-tab`: `border-l-4 border-l-tertiary-container` at `-QuestionCard.tsx:130`. Genuine; DESIGN.md line 190 bans >1px decorative side stripes. The detector's near-silence is misleading — the real system drift is invisible to it:

- `app.css:105` redefines `--font-sans: 'Geist Variable'` *after* `app.css:45` sets Manrope. Later declaration wins, so **every control, label and button on this page renders in Geist, not Manrope** — while Manrope is still downloaded at `app.css:1`. The Scholarly Contrast Rule is half-implemented by accident.
- `app.css:182` sets `--radius: 0.625rem`, so every shadcn primitive defaults to 10px corners in a 0px system. The page fights it with `rounded-none` at `:1044, :1050`.
- `text-[28px]` panel headings ×7 — a size absent from the type scale. `text-[10px]` badges ×4, below the 12px label floor. `tracking-[0.12em]` where the spec says `0.08em`.
- `border-stone-100` (`:1080, 1088, 1096`) — cool Tailwind grey inside a warm archival system that has `outline-variant`.
- ~94 spacing values off the 12/18/24/32/48 scale (Tailwind's 4px default scale used throughout).
- `app.css:69` paints a `radial-gradient` blue wash across the whole body.

**Visual overlays:** none. Assessment B found a dev server on :3000, but it belonged to an unrelated project. No viva-voce-ai server was running and none was started, so there is no user-visible overlay in the browser.

## Overall Impression

The domain thinking here is better than the interface expressing it. `evaluateReadiness` and the error copy are the work of someone who understands assessment. But the page has three ways to silently destroy an assessment record, and it spends its best design energy on a loading skeleton.

The single biggest opportunity: **this page is trying to be three surfaces at once** — read the submission, build the question set, conduct the viva — and conducting is the one it does worst, on the same screen where a real student is sitting opposite a real teacher.

## What's Working

1. **The readiness model is real domain work.** `evaluateReadiness` (`vivaSession.ts:25-65`) returns imperative, teacher-legible blocking reasons — "Confirm the student and submission are correct", "Enter a reason recording is disabled" — and the panel refuses to render until the set is marked ready. That is "keep the teacher in control" actually implemented. It deserves far more visual prominence than it gets.

2. **Error copy is disciplined to a rare degree.** Every failure across six files uses the same blameless construction naming the specific object: "We could not load the submission", "We couldn't save your Observation". No "Oops", no codes, no blame. That consistency *is* the calm institutional voice PRODUCT.md asks for, and it holds under pressure.

3. **The submission reading column is the paper idea executed correctly.** `:1059-1066` — serif, relaxed leading, `max-w-2xl`. Correct measure, correct face, and the one place the product looks like nothing else.

## Priority Issues

### [P0] "Start Viva Session" does not start recording
**What:** The readiness ceremony includes a microphone check and a recording-consent decision, then a button labelled "Start Viva Session". `startVivaSession` (`:853`) only inserts a DB row. Verified: `useVivaAudioCapture` is imported **only** by `submissions.$submissionId.conduct.tsx:15`. Audio capture begins exclusively via a second, differently-named button ("Start recording") on a second route (`-ConductModePanel.tsx:160-169`). Nothing on this page says so; the panel's own subtitle is "Confirm the details below to start a Viva Session for this submission."
**Why it matters:** A teacher who just recorded consent and passed a mic check will reasonably believe they are being recorded. They conduct a 25-minute assessment. There is no audio, and the viva cannot be re-run — the student has already answered. This is unrecoverable loss of the product's core artefact, and the mic check actively trains the wrong belief.
**Fix:** Either make Start begin capture, or rename honestly and show state. Minimum: relabel to "Prepare session", and once a session exists replace the "Conduct Viva Session" link (`:1182-1189`) with a full-width primary block reading "Not recording — open Conduct mode to begin", carrying live `RecordingStatus`. Add a persistent page-level recording indicator true on both routes.
**Suggested command:** `/impeccable harden`

### [P0] Observation autosave silently drops the last edit while reporting "Saved"
**What:** `-VivaSessionCapturePanel.tsx:88-98` debounces persistence 500ms. `:66-72` clears the pending timeout on unmount **with no flush**. `saveStatus` is only ever mutated inside `persistObservation` (`:74-86`), so it stays `"saved"` from the previous cycle while newly typed text sits unpersisted (`:180-182`). Selecting a different asked question unmounts the card (`key={selectedAskedQuestion.id}`, `:396`).
**Why it matters:** Observations are the assessment record — the thing a grade appeal turns on. A teacher types a final sentence, clicks the next question, and it is gone, while the interface said "Saved". Silent loss of evidentiary data plus a false confirmation is the worst available combination.
**Fix:** Flush on unmount and on blur; set status to `"unsaved"` on keystroke so "Saved" is only ever true; add a `beforeunload` guard while a write is pending.
**Suggested command:** `/impeccable harden`

### [P0] The wrong-student safeguard can't be performed by a human
**What:** `-VivaSessionReadinessPanel.tsx:196-198` renders *"I've confirmed this is the correct student ({studentId}) and submission ("{submissionTitle}")"* where `studentId` is a raw DB identifier. Same at `:1031, :1092`. (The submission title *is* shown and is checkable — the student is not.)
**Why it matters:** This checkbox exists solely to prevent recording an assessment against the wrong person — a data-protection incident and an assessment-integrity failure. No teacher can verify a UUID against the human in front of them, so they will tick it reflexively. The control is worse than absent: it manufactures an audit trail of a check that never happened.
**Fix:** Join the student record and show a name plus a human-readable identifier (candidate number, class). If only an id exists, show something checkable against reality — title, date, opening lines — not the id.
**Suggested command:** `/impeccable clarify`

### [P1] Row actions are hover-only, never revealed on focus, and one does nothing
**What:** `-QuestionCard.tsx:147` — `opacity-0 group-hover:opacity-100` with no `group-focus-within:` counterpart. Verified: the "Star" button (`:159-165`) has an `aria-label` and no `onClick`, no handler, no state. It is a fully rendered, focusable, permanently inert control.
**Why it matters:** Keyboard users tab into invisible buttons (WCAG 2.4.7 failure). Touch users — teachers on iPads, the natural device here — cannot reach Edit at all. And a dead Star teaches the teacher that this interface's controls may not do anything, which is corrosive in software whose value proposition is trustworthy records.
**Fix:** Add `group-focus-within:opacity-100` and make actions permanently visible below `lg`. Delete Star or implement it.
**Suggested command:** `/impeccable audit`

### [P1] The sticky rail strands the primary action and gives it no hierarchy
**What:** `:1139` — `lg:sticky lg:top-24` on an aside holding four stacked panels. With an active session it far exceeds viewport height, so once pinned its lower half — Stage 2's Start button, Stage 3 capture, audio upload — can't be scrolled into view for most of the page's scroll range. Compounding it, "Conduct Viva Session" (`:1182-1189`) uses the default `buttonClassName()` — identical in weight to "Record follow-up as asked".
**Why it matters:** The most consequential action in the product is below the fold, intermittently unreachable, and indistinguishable from six routine controls. A teacher with a student waiting is scrolling a frozen sidebar hunting for the button that starts the assessment.
**Fix:** Add `lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto`, or drop `sticky`. Then lift the conduct action into `PageFrame`'s `actions` slot and give it the page's only Institutional Navy `#002046` treatment — DESIGN.md line 181 reserves that colour for exactly this.
**Suggested command:** `/impeccable layout`

## Cognitive Load: 6 of 8 fail — CRITICAL

- **Single focus — FAIL.** The Viva Questions tab supports authoring, sequencing, pre-flight check, live capture, and audio upload simultaneously (`:1110-1297`).
- **Chunking — FAIL.** Right rail stacks 4 top-level panels; readiness presents 6 ungrouped inputs in a flat column.
- **Grouping — FAIL.** "Evidence / Oral Examination Audio" (`:1210`) sits inside the Stage 1→2→3 spine with no stage label.
- **Visual hierarchy — FAIL.** Every panel heading is the same `text-[28px]` serif; every action the same 44px navy button. "Conduct Viva Session" — the point of no return — looks identical to "Record follow-up as asked".
- **One thing at a time — FAIL.** Build, prepare, and capture are all on screen at once.
- **Minimal choices — FAIL.** With 8 set questions the right rail carries ~35 interactive controls in one 5-column strip. The whole page with 12 questions is ~85 focusable controls, ~10 at identical primary weight.
- **Working memory — FAIL.** Two instances of every selected question with no shared identity; two "expected duration" figures with the same name.
- **Progressive disclosure — PASS.** Genuinely good: readiness gates on set status, capture appears only with an active session, the manual-question form collapses.

## Emotional Journey

**Peak-end is inverted.** The most crafted moment is the one where nothing happens — the generation shell, with its three-step assembly narrative and live status pulse. The moment that matters — committing to record a real assessment — is a text link in a sidebar.

**The valley is the Stage 2 → Stage 3 handoff, and it is severe** (see P0 #1). The mic check trains the teacher to believe capture is live when it is not.

**Reassurance is absent at every high-stakes moment.** No confirmation step, no summary of what is about to happen, no statement of where the recording goes or who can hear it, no "you can pause at any time". The "(private)" qualifier on teacher notes exists on the Conduct page (`-ConductModePanel.tsx:226`) but *not* here, where notes render as ordinary muted paragraphs (`-QuestionCard.tsx:171-175`).

Secondary: the disabled Start button is `pointer-events-none` (`Button.tsx:29`) and not associated with the blocking-reasons list above it, so the experience is "the button is dead and I don't know why". And every button label collapses to `"Working..."` mid-action, so the moment you commit, the interface forgets what you asked for.

## Persona Red Flags

**Alex (power user, 30 vivas this week)**
- Lands on the wrong tab every time — `defaultValue="submission"` (`:1036`) opens the reading view; the work is one tab over. No URL state, so bookmarks and Back can't fix it.
- Sequencing is O(n²) clicks. Each move rewrites *every* position (`:809-823`) and invalidates the whole query, so checkboxes flicker between steps. Ordering 10 questions ≈ 45 round trips.
- No bulk operations despite `is_recommended` existing in the data (`:84, :156`).
- "Remove" sits 4px under "Move down", ~20px tall, no confirm, no undo. Speed guarantees a mis-click and the mis-click is destructive.

**Sam (keyboard + screen reader)**
- Tabs into invisible controls (`-QuestionCard.tsx:147`), one of which does nothing.
- Mic-check result is a bare `<span>` (`-VivaSessionReadinessPanel.tsx:253-259`); the blocking-reasons list has no `role="alert"` and no `aria-describedby` from the disabled Start button. Sam finds a dead button with no explanation.
- Every row action announces the entire question text — Sam hears a 30-word question five times per row.
- "Recommended" is a colour stripe for sighted users and `sr-only` text for everyone else — two disjoint encodings, neither complete.
- Upload progress/error (`:1256-1263`) and the generation "In progress" badge (`:516-524`) have no live region.
- Checkboxes are `h-4 w-4` (16px), radios browser-default — under the 44px target, mitigated only by label-wrap.

**Riley (stress tester)**
- **Zero-question dead end.** If generation succeeds but returns no questions, `generationState` → `"idle"` (`:889`), `hasTriggeredGenerationRef` blocks retry (`:874, :908`), and `:966` routes back to the generation shell — a permanent animated "In progress" screen for something that will never happen.
- Refresh mid-generation starts a *second* generation — `hasTriggeredGenerationRef` is a `useRef` (`:653`) reset on mount. Duplicate LLM cost.
- `key={paragraph}` (`:1063`) → duplicate React keys on any repeated line.
- Timezone hardcoded to UTC in `formatSubmissionDate` (`:441-445`) and `formatStartedAt`. A UK teacher starting at 15:30 BST sees "Started 14:30" in an evidentiary record.
- `crypto.randomUUID()` (`:371`) throws on non-secure origins; filename concatenated unsanitised into the storage path.
- 2GB upload hits no size/duration/type validation beyond `accept="audio/*"`, no progress indicator.
- `Number("abc")` → `NaN` reaches `expectedDurationMinutes`; `NaN <= 0` is `false`, so `vivaSession.ts:58-62` passes NaN into the session record.
- Three query regions silently swallow errors — `.error` is referenced zero times for `vivaSessionQuery`, `askedQuestionsQuery`, `vivaAudioQuery` across 1301 lines. `askedQuestionsQuery` also has no loading state, so genuine loading renders as "No questions have been asked yet."

**Priya (teacher mid-viva, student sitting opposite — project persona)**
- **Private teacher notes are unlabelled as private on this page** (`-QuestionCard.tsx:171-175`). Angle the laptop, project, or screen-share and the student reads the examiner's crib notes.
- **Evidence markers are legible across the desk.** "Concern" and "Needs further probing" are full-width navy buttons. The student watches their assessor press "Concern". No discreet mode anywhere.
- No way to operate this page while maintaining eye contact: ~35 controls, ~20px text targets, no shortcuts, no large-type mode.
- **Two competing places to capture the same session** — this page's capture panel and `/conduct` both offer "Mark as asked". Only `/conduct` records audio. Nothing says which one she should be in.

## Minor Observations

- Burnished Umber is specified to "stay rare" (DESIGN.md 110) but drives every recommended badge and the "Ready for Viva" chip.
- The submission text — the artefact under assessment — is `text-on-surface-variant` (`:1061`), the *secondary* ink. The most important reading content is de-emphasised relative to the questions about it.
- `-QuestionSetPanel.tsx:129-144` labels a bare count "Category balance" with no target or interpretation. It reads as a metric because it is one.
- `:1113` puts a lone `<Heading level={2}>` in its own 7-column grid row, leaving a 5-column empty band above the rail.
- The blocking-reasons `<ul>` has markers stripped by preflight, so multiple reasons read as one run-on block.
- "Cancel" in the readiness panel (`:324`) cancels nothing — it destructively resets a form still being filled, sitting immediately beside "Start Viva Session".
- Three error branches are byte-identical apart from the message and offer no recovery action.
- `<track kind="captions" />` (`:1277`) has no `src` — it satisfies a linter, not a user.
- `border-dashed` means "empty placeholder" in `-QuestionCard.tsx:234` and "currently selected" in `-VivaSessionCapturePanel.tsx:384`.
- `-QuestionCard.tsx:28` initialises `draftText` from a prop with no sync; a background refetch leaves a stale draft that overwrites on save.

## Questions to Consider

1. **Why are the submission and the questions in different tabs?** What if questions lived in the margin of the submission, anchored to the passage that generated them? That single change would make this page impossible to mistake for any other product — and it kills the tab bar, the duplicated question instances, and half the working-memory load.
2. **Why does a page about conducting a viva contain a form?** With the student in the room the teacher needs one question, one note field, one recording state. What if prep and conduct were genuinely different surfaces with different typographic scales — prep dense and editorial, conduct large-type and readable at arm's length while looking someone in the eye?
3. **If the microphone check isn't connected to the recording, what is it for?** Should readiness be a *gate* on recording rather than a ritual before it — can you make it impossible to conduct a viva that isn't being captured, unless consent was explicitly declined?
4. **What should happen when the teacher closes the laptop mid-viva?** Right now unflushed observations vanish and the session says "active" forever. Is a viva session a document that survives the browser, or transient UI state? The code hasn't decided.
5. **Who is the student to this system?** Currently a foreign key. In a product whose defining risk is assessing the wrong person, is that sustainable?
