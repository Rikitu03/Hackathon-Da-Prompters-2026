-- DEVELOPMENT ONLY: run as postgres against gabayiskolar-dev.
-- The integration supplies transaction-local settings after BEGIN.
-- No password is stored in this tracked file and no public signup is enabled.
begin;
-- SEED_SETTINGS
do $$
declare
  seed_email text := lower(nullif(current_setting('gabayiskolar.seed_email', true), ''));
  seed_password text := nullif(current_setting('gabayiskolar.seed_password', true), '');
  seed_user_id uuid;
  existing_marker text;
  existing_hash text;
begin
  if current_setting('gabayiskolar.seed_project', true) is distinct from 'jchbbechdldfcyralrln' then
    raise exception 'Explicit shared development project reference required';
  end if;
  if seed_email is distinct from 'dev-admin@gabayiskolar.test' or seed_password is null or length(seed_password)<20 then
    raise exception 'Expected development seed email and a generated password of at least 20 characters';
  end if;
  select id, raw_app_meta_data->>'development_seed', encrypted_password
    into seed_user_id, existing_marker, existing_hash from auth.users where lower(email)=seed_email;
  if seed_user_id is not null then
    if existing_marker is distinct from 'gabayiskolar-v1' then
      raise exception 'An unrelated account already uses the seed email; refusing to modify it';
    end if;
    if existing_hash is distinct from extensions.crypt(seed_password, existing_hash) then
      raise exception 'Seed account exists with another password; use the saved seed credentials';
    end if;
  else
    seed_user_id := gen_random_uuid();
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
      confirmation_token,recovery_token,email_change_token_new,email_change_token_current,
      email_change,reauthentication_token,raw_app_meta_data,raw_user_meta_data,
      is_super_admin,is_sso_user,is_anonymous,created_at,updated_at)
    values('00000000-0000-0000-0000-000000000000',seed_user_id,'authenticated','authenticated',seed_email,
      extensions.crypt(seed_password,extensions.gen_salt('bf',10)),now(),
      '','','','','','',
      '{"provider":"email","providers":["email"],"development_seed":"gabayiskolar-v1"}'::jsonb,
      '{"display_name":"Development test publisher"}'::jsonb,
      false,false,false,now(),now());
    insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at)
    values(seed_user_id::text,seed_user_id,
      jsonb_build_object('sub',seed_user_id::text,'email',seed_email,'email_verified',true,'phone_verified',false),
      'email',now(),now());
  end if;
  insert into public.admin_profiles(user_id,role) values(seed_user_id,'publisher')
    on conflict(user_id) do nothing;
end;
$$;
commit;
select u.id, u.email, p.role, u.email_confirmed_at is not null as email_confirmed,
  exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='email') as email_identity
from auth.users u join public.admin_profiles p on p.user_id=u.id
where u.email='dev-admin@gabayiskolar.test';
