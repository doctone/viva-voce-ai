create policy "authenticated users can insert submissions"
on public.submissions
for insert
to authenticated
with check (true);
