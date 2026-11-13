-- One quota across product help and published-guide chat, including separate server instances.
create table private.gabay_chat_windows (
  bucket text not null check (bucket ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check (attempts between 1 and 10),
  primary key (bucket, window_start)
);
alter table private.gabay_chat_windows enable row level security;
revoke all on private.gabay_chat_windows from public, anon, authenticated;

create function private.take_gabay_chat_limit(p_bucket text, p_issued_at bigint, p_proof text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
  v_start timestamptz;
  v_attempts integer;
  v_retry integer;
begin
  if (select auth.uid()) is not null then
    raise exception 'Anonymous server request required' using errcode = '42501';
  end if;
  select secret into v_secret from private.applicant_session_secret where singleton;
  if v_secret is null or p_bucket is null or p_bucket !~ '^[0-9a-f]{64}$'
    or p_issued_at is null or abs(extract(epoch from clock_timestamp()) - p_issued_at) > 90
    or p_proof is null or p_proof !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid chat limit request' using errcode = '42501';
  end if;
  if encode(extensions.hmac('chat-limit|' || p_bucket || '|' || p_issued_at::text, v_secret, 'sha256'), 'hex') <> p_proof then
    raise exception 'Invalid server proof' using errcode = '42501';
  end if;
  v_start := to_timestamp(floor(extract(epoch from clock_timestamp()) / 600) * 600);
  insert into private.gabay_chat_windows as counters (bucket, window_start, attempts)
    values (p_bucket, v_start, 1)
    on conflict (bucket, window_start) do update set attempts = counters.attempts + 1
    where counters.attempts < 10
    returning attempts into v_attempts;
  v_retry := greatest(1, ceil(extract(epoch from v_start + interval '10 minutes' - clock_timestamp()))::integer);
  return jsonb_build_object('allowed', v_attempts is not null, 'retryAfterSec', case when v_attempts is null then v_retry else 0 end);
end;
$$;
revoke all on function private.take_gabay_chat_limit(text, bigint, text) from public, anon, authenticated;
grant execute on function private.take_gabay_chat_limit(text, bigint, text) to anon;

create function public.take_gabay_chat_limit(p_bucket text, p_issued_at bigint, p_proof text)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.take_gabay_chat_limit(p_bucket, p_issued_at, p_proof)
$$;
revoke all on function public.take_gabay_chat_limit(text, bigint, text) from public, anon, authenticated;
grant execute on function public.take_gabay_chat_limit(text, bigint, text) to anon;

select cron.schedule('gabay-chat-limit-retention', '23 * * * *',
  'delete from private.gabay_chat_windows where window_start < now() - interval ''1 hour''');
