begin;
-- Secret-bearing records are private: no client can read hashes or write tokens.
create table private.check_in_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null,
  student_id uuid not null,
  issued_by uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  foreign key (academy_id, student_id) references public.students(academy_id, id),
  foreign key (academy_id, issued_by) references public.memberships(academy_id, user_id),
  check (expires_at = issued_at + interval '120 seconds')
);
create unique index check_in_qr_one_active on private.check_in_qr_tokens(academy_id, student_id)
  where consumed_at is null and revoked_at is null;
create index check_in_qr_student_issued on private.check_in_qr_tokens(academy_id, student_id, issued_at desc);
alter table private.check_in_qr_tokens enable row level security;
revoke all on private.check_in_qr_tokens from public, anon, authenticated, service_role;

create table private.check_in_qr_scan_limits (
  academy_id uuid not null,
  user_id uuid not null,
  window_start timestamptz not null,
  attempts integer not null,
  primary key (academy_id, user_id),
  foreign key (academy_id, user_id) references public.memberships(academy_id, user_id)
);
alter table private.check_in_qr_scan_limits enable row level security;
revoke all on private.check_in_qr_scan_limits from public, anon, authenticated, service_role;

create function private.check_qr_staff_limit(p_academy_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_now timestamptz := clock_timestamp(); v_attempts integer;
begin
  if coalesce(private.member_role(p_academy_id)::text, '') not in ('OWNER', 'COACH') then
    raise exception 'Academy staff required' using errcode = '42501';
  end if;
  insert into private.check_in_qr_scan_limits as limits(academy_id,user_id,window_start,attempts)
    values (p_academy_id,auth.uid(),v_now,1)
    on conflict (academy_id,user_id) do update set
      attempts = case when limits.window_start <= v_now - interval '1 minute' then 1 else limits.attempts + 1 end,
      window_start = case when limits.window_start <= v_now - interval '1 minute' then v_now else limits.window_start end
    returning attempts into v_attempts;
  return v_attempts <= 60;
end;
$$;
revoke all on function private.check_qr_staff_limit(uuid) from public, anon, authenticated;

create function public.issue_check_in_qr(p_academy_id uuid, p_student_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_token text; v_now timestamptz; v_id uuid; v_last timestamptz;
begin
  perform 1 from public.students where academy_id=p_academy_id and id=p_student_id
    and user_id=auth.uid() for update;
  if not found or private.member_role(p_academy_id) is distinct from 'STUDENT'::public.academy_role then
    raise exception 'Own student required' using errcode = '42501';
  end if;
  v_now := clock_timestamp();
  select max(issued_at) into v_last from private.check_in_qr_tokens
    where academy_id=p_academy_id and student_id=p_student_id;
  if v_last > v_now - interval '5 seconds' then
    raise exception 'QR rate limit' using errcode = 'Q0005';
  end if;
  update private.check_in_qr_tokens set revoked_at=v_now
    where academy_id=p_academy_id and student_id=p_student_id and consumed_at is null and revoked_at is null;
  -- Two independent cryptographically random UUIDs provide 244 random bits.
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into private.check_in_qr_tokens(academy_id,student_id,issued_by,token_hash,issued_at,expires_at)
    values(p_academy_id,p_student_id,auth.uid(),encode(sha256(convert_to(v_token,'UTF8')),'hex'),v_now,v_now+interval '120 seconds')
    returning id into v_id;
  -- The plaintext exists only in this response, never in a persisted column.
  return jsonb_build_object('id',v_id,'token',v_token,'server_now',v_now,'expires_at',v_now+interval '120 seconds');
end;
$$;

create function private.validate_check_in_qr(p_academy_id uuid, p_token text)
returns private.check_in_qr_tokens language plpgsql security definer set search_path = '' as $$
declare v_qr private.check_in_qr_tokens;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid QR' using errcode = 'Q0001';
  end if;
  select * into v_qr from private.check_in_qr_tokens where academy_id=p_academy_id
    and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'Invalid QR' using errcode = 'Q0001'; end if;
  if v_qr.consumed_at is not null then raise exception 'QR already used' using errcode = 'Q0003'; end if;
  if v_qr.revoked_at is not null then raise exception 'QR revoked' using errcode = 'Q0004'; end if;
  if v_qr.expires_at <= clock_timestamp() then raise exception 'QR expired' using errcode = 'Q0002'; end if;
  if not exists(select 1 from public.students s join public.memberships m
    on m.academy_id=s.academy_id and m.user_id=s.user_id
    where s.academy_id=v_qr.academy_id and s.id=v_qr.student_id and s.user_id=v_qr.issued_by and m.role='STUDENT') then
    raise exception 'Student access unavailable' using errcode = '42501';
  end if;
  return v_qr;
end;
$$;
revoke all on function private.validate_check_in_qr(uuid,text) from public, anon, authenticated;

create function public.preview_check_in_qr(p_academy_id uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_qr private.check_in_qr_tokens; v_name text;
begin
  if not private.check_qr_staff_limit(p_academy_id) then return jsonb_build_object('error_code','Q0005'); end if;
  begin
    v_qr := private.validate_check_in_qr(p_academy_id,p_token);
    select full_name into v_name from public.students where academy_id=p_academy_id and id=v_qr.student_id;
    return jsonb_build_object('student_id',v_qr.student_id,'student_name',v_name,'expires_at',v_qr.expires_at);
  exception when sqlstate 'Q0001' or sqlstate 'Q0002' or sqlstate 'Q0003' or sqlstate 'Q0004' or insufficient_privilege then
    return jsonb_build_object('error_code',sqlstate);
  end;
end;
$$;

create function public.redeem_check_in_qr(p_academy_id uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_qr private.check_in_qr_tokens; v_student_id uuid; v_result jsonb;
begin
  if not private.check_qr_staff_limit(p_academy_id) then return jsonb_build_object('error_code','Q0005'); end if;
  begin
  -- Locate without locking; every mutating flow locks student BEFORE token.
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid QR' using errcode = 'Q0001';
  end if;
  select student_id into v_student_id from private.check_in_qr_tokens where academy_id=p_academy_id
    and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if not found then raise exception 'Invalid QR' using errcode = 'Q0001'; end if;
  perform 1 from public.students where academy_id=p_academy_id and id=v_student_id for update;
  perform 1 from private.check_in_qr_tokens where academy_id=p_academy_id
    and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
  -- Recheck expiry with clock_timestamp AFTER any lock wait, and recheck current access.
  if coalesce(private.member_role(p_academy_id)::text, '') not in ('OWNER','COACH') then
    raise exception 'Academy staff required' using errcode = '42501';
  end if;
  v_qr := private.validate_check_in_qr(p_academy_id,p_token);
  update private.check_in_qr_tokens set consumed_at=clock_timestamp() where id=v_qr.id;
  v_result := public.record_check_in(p_academy_id,v_qr.student_id);
  return v_result || jsonb_build_object('student_id',v_qr.student_id);
  exception when sqlstate 'Q0001' or sqlstate 'Q0002' or sqlstate 'Q0003' or sqlstate 'Q0004' or insufficient_privilege then
    -- This subtransaction rolls back token/presence mutations while retaining the attempt limit.
    return jsonb_build_object('error_code',sqlstate);
  end;
end;
$$;

create function public.check_in_qr_status(p_academy_id uuid,p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_qr private.check_in_qr_tokens;
begin
  select q.* into v_qr from private.check_in_qr_tokens q join public.students s
    on s.academy_id=q.academy_id and s.id=q.student_id
    where q.academy_id=p_academy_id and q.id=p_id and q.issued_by=auth.uid() and s.user_id=auth.uid();
  if not found or private.member_role(p_academy_id) is distinct from 'STUDENT'::public.academy_role then
    raise exception 'Own student required' using errcode = '42501';
  end if;
  return jsonb_build_object('consumed',v_qr.consumed_at is not null,'revoked',v_qr.revoked_at is not null,
    'expired',v_qr.expires_at <= clock_timestamp());
end;
$$;
revoke all on function public.issue_check_in_qr(uuid,uuid), public.preview_check_in_qr(uuid,text),
  public.redeem_check_in_qr(uuid,text), public.check_in_qr_status(uuid,uuid) from public,anon;
grant execute on function public.issue_check_in_qr(uuid,uuid), public.preview_check_in_qr(uuid,text),
  public.redeem_check_in_qr(uuid,text), public.check_in_qr_status(uuid,uuid) to authenticated;
commit;
