-- Teachers can correct a wrong speaker label (#94). The correction is stored
-- with speaker_source = 'teacher'; saving utterances for a chunk is an
-- insert-or-ignore, so re-transcription never overwrites it.
create policy "authenticated users can correct viva transcript utterances"
on public.viva_transcript_utterances
for update
to authenticated
using (true)
with check (true);
