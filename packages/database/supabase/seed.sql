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

delete from public.vivas;
delete from public.students;

insert into public.students (id, created_at)
values
  ('10420000-0000-0000-0000-000000000000', '2026-03-12T09:00:00Z'),
  ('10980000-0000-0000-0000-000000000000', '2026-03-10T09:00:00Z'),
  ('11310000-0000-0000-0000-000000000000', '2026-03-08T09:00:00Z'),
  ('11840000-0000-0000-0000-000000000000', '2026-03-05T09:00:00Z'),
  ('12170000-0000-0000-0000-000000000000', '2026-03-03T09:00:00Z');

insert into public.vivas (
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
    'Modernist Poetry Oral Defence',
    'This submission examines how modernist poets use fragmentation, voice, and formal disruption to reshape the reader''s relationship to memory and public language.',
    '2026-03-12T09:00:00Z'
  ),
  (
    '20980000-0000-0000-0000-000000000000',
    '10980000-0000-0000-0000-000000000000',
    'Postcolonial Literature Reflection',
    'This reflection argues that postcolonial fiction uses narrative perspective and silence to expose how institutional power reshapes both identity and historical memory.',
    '2026-03-10T09:00:00Z'
  ),
  (
    '21310000-0000-0000-0000-000000000000',
    '11310000-0000-0000-0000-000000000000',
    'Political Rhetoric and Public Speech Analysis',
    'The piece analyses how pacing, repetition, and audience positioning are used in public speech to produce legitimacy, urgency, and moral alignment.',
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
