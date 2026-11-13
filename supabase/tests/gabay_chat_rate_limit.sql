-- Run as the database owner after the limiter migration. All fixtures roll back.
begin;
do $$
declare
  v_secret text;
  v_bucket text := repeat('e', 64);
  v_time bigint := floor(extract(epoch from clock_timestamp()));
  v_proof text;
  v_result jsonb;
  v_rejected boolean;
begin
  select secret into v_secret from private.applicant_session_secret where singleton;
  if v_secret is null then raise exception 'Provision the existing signing secret first'; end if;
  delete from private.gabay_chat_windows where bucket = v_bucket;
  -- Old windows never consume the current window's quota.
  insert into private.gabay_chat_windows values (v_bucket, now() - interval '20 minutes', 10);
  v_proof := encode(extensions.hmac('chat-limit|' || v_bucket || '|' || v_time, v_secret, 'sha256'), 'hex');
  for attempt in 1..10 loop
    v_result := public.take_gabay_chat_limit(v_bucket, v_time, v_proof);
    if not (v_result->>'allowed')::boolean then raise exception 'Attempt % was denied early', attempt; end if;
  end loop;
  v_result := public.take_gabay_chat_limit(v_bucket, v_time, v_proof);
  if (v_result->>'allowed')::boolean or (v_result->>'retryAfterSec')::integer not between 1 and 600 then
    raise exception 'Eleventh request bypassed quota or returned invalid retry';
  end if;
  v_rejected := false;
  begin
    perform public.take_gabay_chat_limit(v_bucket, v_time, repeat('0',64));
  exception when insufficient_privilege then v_rejected := true;
  end;
  if not v_rejected then raise exception 'Invalid proof accepted'; end if;
  v_rejected := false;
  begin
    perform public.take_gabay_chat_limit(v_bucket, v_time-91,
      encode(extensions.hmac('chat-limit|' || v_bucket || '|' || (v_time-91), v_secret, 'sha256'), 'hex'));
  exception when insufficient_privilege then v_rejected := true;
  end;
  if not v_rejected then raise exception 'Expired proof accepted'; end if;
  execute 'set local role anon';
  v_rejected := false;
  begin perform * from private.gabay_chat_windows;
  exception when insufficient_privilege then v_rejected := true;
  end;
  execute 'reset role';
  if not v_rejected then raise exception 'Anonymous direct table access permitted'; end if;
end $$;
rollback;
