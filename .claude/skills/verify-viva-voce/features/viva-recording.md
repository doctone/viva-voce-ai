# Viva recording

On a submission's detail page, the Viva Recording section lets a teacher record the viva live from the microphone, or upload an existing audio file. Saved recordings play back inline with a transcript, and the submission's status becomes `Recorded`.

## Sub-features

- `recording-upload` uploads an audio file. It is stored in the `submission-viva-audio` bucket with a `submission_viva` row.
- `recording-upload-reject` rejects non-audio files and files over 500 MB with an inline error.
- `recording-live` covers `Record viva`, then `Pause`/`Resume`, then `Stop Recording`. Chunks upload to `viva_recording_chunks` and transcribe into `viva_transcript_segments`.
- `recording-playback` shows an audio player and a `Transcript` heading for an existing recording.

## How to get to it (user POV)

- Open a submission from `/submissions`. The `Viva Recording` region is at the top of the detail page.
- Choose `Upload A Recording` (a label for the hidden `#submissionVivaUpload` input), or the `Record viva` button.

## Driving it with verify.sh

Preconditions:

- Baseline from [README.md](README.md). You are logged in.
- Upload fixture: `Technology in Schools Needs Careful Balance` (`21310000-0000-0000-0000-000000000000`, no audio).
- Playback fixture: `Technology in Schools Should Be Limited` (`20420000-0000-0000-0000-000000000000`, has audio and a transcript).
- A short audio file tagged with the run id, e.g. `say -o ".verify/<run-id>/verify-<run-id>.m4a" --data-format=aac "Verification recording"` (macOS `say`).

- **Playback.** Run `$V ab open http://localhost:3100/submissions/20420000-0000-0000-0000-000000000000` then `$V ab wait --text "TRANSCRIPT"`. The region shows `heading "TRANSCRIPT"`, a `play` button and an `audio time scrubber` slider. Run `$V shot viva-recording-playback`.
- **Upload.** Run:
  - `$V ab open http://localhost:3100/submissions/21310000-0000-0000-0000-000000000000`
  - `$V ab wait --text "No recording yet."`
  - `$V shot viva-recording-before`
  - `$V ab upload "#submissionVivaUpload" "$PWD/.verify/<run-id>/verify-<run-id>.m4a"`

  The `No recording yet.` text is replaced by a player. Wait for it and then run `$V shot viva-recording-after`.
- **Upload side effects.** Run the following and save the output as evidence:

  ```bash
  $V sql "select id, audio_path, file_name from submission_viva where file_name like 'verify-<run-id>%'"
  $V sql "select name from storage.objects where bucket_id = 'submission-viva-audio' and name like '21310000-0000-0000-0000-000000000000/%'"
  ```

  They show one row and one stored object. On `/submissions` the fixture's status is now `Recorded`.
- **Reject non-audio.** Upload a `.txt` file. The inline error reads `That file is not audio. Choose a recording of the viva.` and no `submission_viva` row is added.
- **Cleanup.** Run:

  ```bash
  $V sql "delete from storage.objects where bucket_id = 'submission-viva-audio' and name in (select audio_path from submission_viva where file_name like 'verify-<run-id>%'); delete from submission_viva where file_name like 'verify-<run-id>%' returning id"
  ```

  Keep the audio file under `.verify/<run-id>/`.

## Gotchas

- This recipe was written from the code and has not been run end to end yet. The first run that drives it should fix any step that does not match and remove this line.
- Live recording needs a microphone. Headless Chromium has none unless it is launched with fake-media flags, e.g. `$V ab --args "--use-fake-ui-for-media-stream,--use-fake-device-for-media-stream" open <url>` on the first command of the session. Without them, expect a `permission_denied` state.
- Live recording and transcription call OpenAI (`AI_TRANSCRIPTION_MODEL`, default `gpt-transcribe`). Keep recordings a few seconds long.
- Deleting from `storage.objects` with SQL removes the metadata row but can leave the file in the storage container's volume. That is acceptable for a local stack, but mention it in the report.
- The playback fixture is shared seed data. Do not upload to it or replace its recording.
