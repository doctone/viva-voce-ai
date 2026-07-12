-- Local development seed data.
-- Recreates a deterministic test user for auth flows.

do $$
declare
  seed_user_id uuid := '33333333-3333-3333-3333-333333333333';
begin
  delete from auth.identities
  where user_id = seed_user_id
     or identity_data ->> 'email' = 'will@viva-voce.org';

  delete from auth.users
  where id = seed_user_id
     or email = 'will@viva-voce.org';

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_sent_at,
    recovery_sent_at,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    email_change,
    email_change_token_new,
    recovery_token,
    confirmation_token
  )
  values (
    seed_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'will@viva-voce.org',
    crypt('password-will', gen_salt('bf')),
    now(),
    null,
    null,
    null,
    null,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    seed_user_id,
    seed_user_id,
    jsonb_build_object(
      'sub', seed_user_id::text,
      'email', 'will@viva-voce.org',
      'email_verified', true
    ),
    'email',
    'will@viva-voce.org',
    now(),
    now(),
    now()
  );
end $$;

do $$
begin
  insert into storage.buckets (id, name, public)
  values ('submission-viva-audio', 'submission-viva-audio', false)
  on conflict (id) do update
  set public = excluded.public,
      name = excluded.name;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated users can upload submission viva audio'
  ) then
    create policy "authenticated users can upload submission viva audio"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'submission-viva-audio');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated users can read submission viva audio'
  ) then
    create policy "authenticated users can read submission viva audio"
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'submission-viva-audio');
  end if;
end $$;

delete from public.submission_viva;
delete from public.viva_questions;
delete from public.submissions;
delete from public.students;

insert into public.students (id, created_at)
values
  ('10420000-0000-0000-0000-000000000000', '2026-03-12T09:00:00Z'),
  ('10980000-0000-0000-0000-000000000000', '2026-03-10T09:00:00Z'),
  ('11310000-0000-0000-0000-000000000000', '2026-03-08T09:00:00Z'),
  ('11840000-0000-0000-0000-000000000000', '2026-03-05T09:00:00Z'),
  ('12170000-0000-0000-0000-000000000000', '2026-03-03T09:00:00Z');

insert into public.submissions (
  id,
  student_id,
  submission_title,
  submission_text,
  created_at
)
values
  (
    '20420000-0000-0000-0000-000000000000',
    '10420000-0000-0000-0000-000000000000',
    'Technology in Schools Should Be Limited',
    'Technology in schools is a bad idea and I think it should not be used as much as it is now.

One reason is that it distracts students a lot. For example, if students are using laptops they might go on games or social media instead of doing their work. This means they don''t learn properly and waste time. Teachers also cannot always see what every student is doing so it becomes hard to control.

Another reason is that technology can make students lazy. Instead of thinking for themselves, they just search things up. This means they don''t actually understand the topic. For example, if someone copies from the internet they might not even know what the words mean. This is not real learning and could cause problems later on in exams.

Also, technology can break or not work properly. If the WiFi is down then the whole lesson can be ruined. This wastes time and makes students frustrated. Sometimes computers freeze or lose work which is also annoying.

On the other hand, some people say technology helps learning because you can find information quickly. While this is true, I still think it causes more problems than benefits because students rely on it too much and stop thinking.

In conclusion, technology should not be used too much in schools because it distracts students, makes them lazy and can cause problems in lessons. Schools should focus more on books and writing so students can properly learn.',
    '2026-03-12T09:00:00Z'
  ),
  (
    '20980000-0000-0000-0000-000000000000',
    '10980000-0000-0000-0000-000000000000',
    'Technology in Schools Requires Limits',
    'Technology has become a normal part of everyday life, so it is no surprise that it has entered the classroom. However, I strongly believe that schools should limit the use of technology because, although it has benefits, it can damage students’ ability to think independently.

Firstly, technology encourages distraction. Even in a controlled classroom environment, students can easily switch tabs, check messages, or lose focus. This reduces the quality of learning time. A student who is constantly interrupted by notifications will struggle to fully engage with complex ideas, especially in subjects that require deep concentration such as English or maths.

Secondly, over-reliance on technology weakens critical thinking skills. When students can instantly search for answers, they may stop attempting to solve problems themselves. This leads to shallow understanding. For example, copying information from the internet might help complete a task quickly, but it does not guarantee that the student actually understands the content.

However, it would be unfair to ignore the advantages. Technology can provide access to a wide range of resources, including videos, articles, and interactive tools. These can support different learning styles and make lessons more engaging. In addition, digital skills are important for future careers, so students do need some exposure.

Despite these benefits, the risks are too significant to ignore. If students become dependent on technology, they may struggle in situations where independent thinking is required, such as exams or real-world problem solving.

In conclusion, while technology can enhance learning in some ways, schools should be cautious about its use. Limiting technology would help students develop stronger focus, deeper understanding, and greater independence, which are essential skills for long-term success.',
    '2026-03-10T09:00:00Z'
  ),
  (
    '21310000-0000-0000-0000-000000000000',
    '11310000-0000-0000-0000-000000000000',
    'Technology in Schools Needs Careful Balance',
    'In an age defined by rapid technological advancement, it is tempting to assume that classrooms must evolve in parallel. Many argue that integrating technology into schools is not only beneficial but essential. However, while digital tools undoubtedly offer convenience and innovation, their widespread use in education risks undermining some of the most important aspects of learning.

One of the most significant concerns is the erosion of sustained attention. Technology is designed to capture and hold our focus through constant stimulation, yet meaningful learning often requires patience, reflection, and deep thinking. When students become accustomed to fast-paced digital interaction, they may find it increasingly difficult to engage with more demanding intellectual tasks, such as extended reading or complex problem-solving.

Moreover, the use of technology can create an illusion of understanding. With information readily available at the click of a button, students may mistake access to knowledge for genuine comprehension. The ability to search for an answer is not the same as the ability to explain it, evaluate it, or apply it in a new context. As a result, students may produce work that appears sophisticated but lacks depth upon closer inspection.

That said, it would be unrealistic to reject technology entirely. Digital tools can enrich learning by providing diverse resources and enabling collaboration beyond the classroom. When used carefully, technology can support creativity and broaden students’ perspectives.

The key issue, therefore, is not whether technology should be used, but how it should be used. Schools must strike a balance between embracing innovation and preserving the fundamental skills that underpin true learning.

Ultimately, education is not simply about efficiency or access to information; it is about developing independent, thoughtful individuals. If technology begins to replace rather than support this process, then its role in schools must be reconsidered.',
    '2026-03-08T09:00:00Z'
  ),
  (
    '21840000-0000-0000-0000-000000000000',
    '11840000-0000-0000-0000-000000000000',
    'Victorian Archive Research Commentary',
    'This commentary reviews archival fragments, publication context, and editorial choices to show how Victorian literary authority was constructed and preserved.',
    '2026-03-05T09:00:00Z'
  ),
  (
    '22170000-0000-0000-0000-000000000000',
    '12170000-0000-0000-0000-000000000000',
    'Drama Performance Reflection and Supporting Notes',
    'The submission reflects on rehearsal method, interpretive choices, and supporting annotations to explain how performance decisions shaped character and tone.',
    '2026-03-03T09:00:00Z'
  );

insert into public.viva_questions (
  id,
  submission_id,
  category,
  question_text,
  teacher_note,
  created_at
)
values
  (
    '30420000-0000-0000-0000-000000000000',
    '20420000-0000-0000-0000-000000000000',
    'Concept: Distraction',
    'You argue that laptops make distraction harder to control. What classroom example best proves that point?',
    'Listen for a clear explanation connected to the student''s own example rather than a vague claim.',
    '2026-03-12T09:05:00Z'
  ),
  (
    '30420000-0000-0000-0000-000000000001',
    '20420000-0000-0000-0000-000000000000',
    'Critical Analysis',
    'You say technology makes students lazy. How would you respond to someone who says it actually saves time for deeper thinking?',
    'Listen for whether the student can defend the claim under challenge.',
    '2026-03-12T09:06:00Z'
  ),
  (
    '30420000-0000-0000-0000-000000000002',
    '20420000-0000-0000-0000-000000000000',
    'Ownership',
    'Which sentence in your conclusion feels most convincing to you, and why did you write it in that way?',
    'Listen for drafting choices and ownership of wording.',
    '2026-03-12T09:07:00Z'
  ),
  (
    '30980000-0000-0000-0000-000000000000',
    '20980000-0000-0000-0000-000000000000',
    'Concept: Attention',
    'Why does concentration matter so much to your argument about technology in lessons?',
    'Listen for how the student links distraction to quality of learning rather than only behaviour.',
    '2026-03-10T09:05:00Z'
  ),
  (
    '30980000-0000-0000-0000-000000000001',
    '20980000-0000-0000-0000-000000000000',
    'Argument: Independent Thinking',
    'In your view, what is the difference between quickly finding an answer and genuinely understanding it?',
    'Listen for precise contrast between retrieval and comprehension.',
    '2026-03-10T09:06:00Z'
  ),
  (
    '30980000-0000-0000-0000-000000000002',
    '20980000-0000-0000-0000-000000000000',
    'Ownership',
    'You concede some benefits in the fourth paragraph. Why did you include that counterargument there?',
    'Listen for awareness of structure and persuasive balance.',
    '2026-03-10T09:07:00Z'
  ),
  (
    '31310000-0000-0000-0000-000000000000',
    '21310000-0000-0000-0000-000000000000',
    'Concept: Sustained Attention',
    'What do you mean by saying meaningful learning requires patience, reflection, and deep thinking?',
    'Listen for a developed explanation of why attention matters, not only a repeated phrase.',
    '2026-03-08T09:05:00Z'
  ),
  (
    '31310000-0000-0000-0000-000000000001',
    '21310000-0000-0000-0000-000000000000',
    'Critical Analysis',
    'How does your essay distinguish between access to knowledge and genuine comprehension?',
    'Listen for whether the student can unpack the abstract contrast in their own words.',
    '2026-03-08T09:06:00Z'
  ),
  (
    '31310000-0000-0000-0000-000000000002',
    '21310000-0000-0000-0000-000000000000',
    'Ownership',
    'Which paragraph best represents your strongest thinking, and what makes it stronger than the others?',
    'Listen for reflection on structure, emphasis, and authorial intention.',
    '2026-03-08T09:07:00Z'
  );
