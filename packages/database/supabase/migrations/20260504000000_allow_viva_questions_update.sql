create policy "authenticated users can update viva questions"
on public.viva_questions
for update
to authenticated
using (true)
with check (true);
