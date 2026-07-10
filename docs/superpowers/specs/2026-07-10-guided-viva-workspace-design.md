# Guided Viva Workspace Design

## Purpose

Viva Voce AI will support a teacher through the complete oral-assessment workflow, not only question generation. The product will help the teacher prepare a deliberate question set, conduct a calm recorded conversation, review evidence with post-session AI assistance, and sign a defensible Viva Record.

The teacher remains responsible for every assessment decision. AI may prepare and organize evidence, but it must not grade the student, decide authenticity, or silently alter a signed record.

## Product Direction

The chosen direction is a Guided Viva Workspace with three stages: Prepare, Conduct, and Review. This is preferred over a single long assessment form because each stage has a different cognitive purpose. It is preferred over a recording-first assistant because the teacher should structure the assessment and remain actively in control.

## Domain Model

- A Submission is the source material for one viva workflow, from question preparation through the signed Viva Record.
- A Viva Question Set is an ordered, teacher-approved selection of Viva Questions prepared for one Viva Session.
- A Viva Session represents one conducted conversation and owns its timing, consent state, recording, asked questions, observations, and evidence markers.
- An Asked Question records what the teacher actually asked, including unplanned follow-ups.
- An Observation is a private, timestamped teacher note.
- An Evidence Marker indicates clear understanding, a need for further probing, or a concern. It is not a score or an AI verdict.
- A Viva Conclusion is the teacher's explicit determination after review.
- A Viva Record is the signed, versioned account of the completed assessment.

## Stage 1: Prepare

The existing submission view becomes a preparation workspace. The teacher reviews the submitted work alongside generated questions, sees the source passage and marking criterion behind each generated question, and can edit, remove, regenerate, or manually add questions.

The teacher assembles and orders a Viva Question Set. The product estimates its duration and recommends balance across comprehension and accuracy, argumentation and reasoning, and authenticity and ownership. Recommendations never override teacher selection.

Before Conduct mode, a readiness check confirms the student and submission, recording consent or the reason recording is disabled, microphone access and audio quality, expected duration, and any accessibility adjustments.

## Stage 2: Conduct

Conduct mode is a quiet live control surface. It presents one primary question at a time in highly legible type, with its private Teacher Note, previous and next controls, a compact recording indicator, elapsed time, a persistent note field, and three quick Evidence Markers.

The teacher can open the relevant submission passage without losing their place. Unplanned follow-up questions can be entered immediately or marked at the current audio timestamp for completion after the conversation.

Notes save continuously. Audio is captured in recoverable chunks before upload. A session can pause and resume without creating a second Viva Session. Refreshing, closing, or navigating away triggers a strong warning. Keyboard-only operation is supported. Live AI suggestions are absent by default so the system does not distract from or steer the conversation.

Ending a Viva Session requires confirmation but does not finalize the assessment.

## Stage 3: Review and Sign-off

After the conversation, the app prepares a review workspace containing a searchable transcript synchronized with the recording, links between asked questions and transcript segments, teacher observations and evidence markers, clearly labelled AI-suggested evidence excerpts, unresolved concerns, and recording or transcription quality warnings.

AI drafts a concise summary of demonstrated understanding and ownership. The teacher can amend or reject all AI-generated content.

The teacher chooses one Viva Conclusion:

- Understanding demonstrated
- Further review required
- Authenticity concern
- Unable to conclude

The teacher explains the conclusion and records any follow-up action. Sign-off captures the approving teacher and time. The resulting Viva Record includes the finalized question set, questions actually asked, observations, evidence excerpts, conclusion, recording, transcript, and audit history. Corrections create a new version rather than replacing signed content.

## Privacy and Authority

Recordings, transcripts, observations, and conclusions are private assessment material. Access must be scoped to authorized staff. Recording consent is explicit and retained with the Viva Session. Retention and deletion behavior must be visible and policy-driven.

The student does not see private Teacher Notes, Observations, Evidence Markers, or draft conclusions during the viva. AI-generated material is always distinguishable from teacher-authored material.

## Failure Handling

- Unsynced notes and audio chunks remain recoverable in the browser.
- Failed uploads can be retried without repeating the viva.
- An interrupted session is visibly recoverable and cannot be confused with a completed session.
- Transcription failure does not prevent teacher-authored review and sign-off.
- Uncertain transcript passages display confidence warnings and are not presented as reliable evidence.
- A failed AI draft leaves the original recording, transcript, and teacher observations intact.
- Signed records cannot be silently changed.

## Delivery Sequence

### Release 1: Reliable Live Workspace

Deliver question-set selection and ordering, readiness and consent checks, recoverable recording, question navigation, autosaved observations and evidence markers, interruption recovery, a teacher-authored conclusion, and a basic signed Viva Record.

### Release 2: AI-assisted Review

Add transcription with confidence indicators, question-to-transcript linking, suggested evidence excerpts, a draft summary, and unsupported-claim and recording-quality warnings.

### Release 3: Institutional Workflow

Add version history, audit events, retention and deletion policies, role-based access, moderation, follow-up actions, exports, student history, and department oversight.

## Testing Strategy

- State-machine tests cover preparation, readiness, conducting, pausing, interruption, review, sign-off, and prohibited transitions.
- Component and browser tests cover question navigation, keyboard operation, recording permissions, pause and resume, refresh protection, autosave, and session recovery.
- Integration tests simulate offline periods, partial audio uploads, retry behavior, transcription failure, and AI failure.
- Authorization tests prove that recordings, transcripts, observations, and signed records are unavailable to unauthorized users.
- Accessibility tests verify focus order, visible focus, keyboard-only completion, status announcements, contrast, and reduced-motion behavior.
- AI evaluation fixtures verify that suggested evidence is grounded in the transcript, uncertainty is retained, and unsupported conclusions are rejected.

## Success Measures

- A teacher can conduct and sign off a viva without using separate notes or recording software.
- An interrupted session can be recovered without repeating the conversation or losing existing notes.
- Every signed conclusion is attributable to a teacher and traceable to the evidence they reviewed.
- Teachers can distinguish teacher-authored content from AI-generated suggestions throughout the workflow.
- Pilot teachers report that the workspace reduces post-viva administration without distracting from the student conversation.

## Explicit Non-goals

- Live AI coaching during the conversation
- Automated grades or authenticity verdicts
- Student-facing live controls
- Department analytics before the core assessment workflow is reliable
- Silent mutation of signed records
