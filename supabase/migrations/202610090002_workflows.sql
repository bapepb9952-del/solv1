create function public.create_academy(p_name text, p_timezone text default 'America/Sao_Paulo')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 2 and 100
    or p_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Invalid academy details' using errcode = '22023';
  end if;
  insert into public.academies(name, timezone, created_by)
  values (btrim(p_name), p_timezone, auth.uid()) returning id into v_id;
  insert into public.memberships(academy_id, user_id, role) values (v_id, auth.uid(), 'OWNER');
  return v_id;
end;
$$;

create function public.register_student(
  p_academy_id uuid, p_full_name text, p_belt public.belt default 'WHITE', p_email text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_user_id uuid; v_role public.academy_role;
begin
  if coalesce(private.member_role(p_academy_id)::text, '') not in ('OWNER', 'COACH') then
    raise exception 'Academy staff required' using errcode = '42501';
  end if;
  if p_full_name is null or char_length(btrim(p_full_name)) not between 2 and 100 or p_belt is null then
    raise exception 'Invalid student details' using errcode = '22023';
  end if;
  if nullif(btrim(p_email), '') is not null then
    select id into v_user_id from auth.users
      where lower(email) = lower(btrim(p_email)) and email_confirmed_at is not null;
    if v_user_id is null then
      raise exception 'Student needs a confirmed account' using errcode = 'P0002';
    end if;
    insert into public.memberships(academy_id, user_id, role)
      values (p_academy_id, v_user_id, 'STUDENT') on conflict do nothing;
    select role into v_role from public.memberships
      where academy_id = p_academy_id and user_id = v_user_id for update;
    if v_role <> 'STUDENT' then
      raise exception 'This account is already academy staff' using errcode = '22023';
    end if;
  end if;
  insert into public.students(academy_id, user_id, full_name, belt)
    values (p_academy_id, v_user_id, btrim(p_full_name), p_belt) returning id into v_id;
  return v_id;
end;
$$;

-- No client-supplied timestamp, XP, actor or achievement can enter this transaction.
create function public.record_check_in(p_academy_id uuid, p_student_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_check_in_id uuid;
  v_now timestamptz := statement_timestamp();
  v_date date;
  v_total integer;
  v_xp bigint;
  v_code text;
  v_unlocked jsonb := '[]'::jsonb;
begin
  if not private.can_read_student(p_academy_id, p_student_id) then
    raise exception 'Student unavailable' using errcode = '42501';
  end if;

  -- Serialize operations for this student, including achievement threshold checks.
  perform 1 from public.students where academy_id = p_academy_id and id = p_student_id for update;
  select (v_now at time zone timezone)::date into v_date from public.academies where id = p_academy_id;
  insert into public.check_ins(academy_id, student_id, local_date, created_at, recorded_by)
    values (p_academy_id, p_student_id, v_date, v_now, auth.uid())
    on conflict (academy_id, student_id, local_date) do nothing returning id into v_check_in_id;

  if v_check_in_id is null then
    select coalesce(sum(xp_delta), 0) into v_xp from public.gamification_events
      where academy_id = p_academy_id and student_id = p_student_id;
    return jsonb_build_object('already_checked_in', true, 'xp_awarded', 0, 'total_xp', v_xp, 'achievements', '[]'::jsonb);
  end if;

  insert into public.gamification_events(academy_id, student_id, event_type, xp_delta, check_in_id, created_at, metadata)
    values (p_academy_id, p_student_id, 'CHECK_IN', 10, v_check_in_id, v_now,
      jsonb_build_object('rule_version', 1, 'local_date', v_date, 'recorded_by', auth.uid()));
  select count(*) into v_total from public.check_ins
    where academy_id = p_academy_id and student_id = p_student_id;

  for v_code in
    insert into public.student_achievements(academy_id, student_id, achievement_code, unlocked_at)
      select p_academy_id, p_student_id, code, v_now from public.achievements where required_sessions <= v_total
      on conflict do nothing returning achievement_code
  loop
    insert into public.gamification_events(academy_id, student_id, event_type, xp_delta, achievement_code, created_at, metadata)
      values (p_academy_id, p_student_id, 'ACHIEVEMENT_UNLOCKED', 0, v_code, v_now,
        jsonb_build_object('rule_version', 1, 'total_sessions', v_total));
    v_unlocked := v_unlocked || jsonb_build_array(v_code);
  end loop;

  select coalesce(sum(xp_delta), 0) into v_xp from public.gamification_events
    where academy_id = p_academy_id and student_id = p_student_id;
  return jsonb_build_object('already_checked_in', false, 'xp_awarded', 10, 'total_xp', v_xp, 'achievements', v_unlocked);
end;
$$;

revoke all on function public.create_academy(text, text) from public, anon;
revoke all on function public.register_student(uuid, text, public.belt, text) from public, anon;
revoke all on function public.record_check_in(uuid, uuid) from public, anon;
grant execute on function public.create_academy(text, text),
  public.register_student(uuid, text, public.belt, text), public.record_check_in(uuid, uuid) to authenticated;

-- Invoker rights are essential: this view must preserve every source table's RLS.
-- Lateral aggregates avoid multiplying the ledger by check-ins (double-counting XP).
create view public.student_metrics with (security_invoker = true) as
select s.id, s.academy_id, s.user_id, s.full_name, s.belt, s.created_at,
  a.timezone,
  (now() at time zone a.timezone)::date as today,
  (s.created_at at time zone a.timezone)::date as joined_on,
  coalesce(x.total_xp, 0)::bigint as total_xp,
  c.total_check_ins, c.sessions_7d, c.sessions_30d, c.sessions_today,
  c.last_training_on, c.last_training_at
from public.students s
join public.academies a on a.id = s.academy_id
cross join lateral (
  select count(*)::integer as total_check_ins,
    count(*) filter (where local_date between (now() at time zone a.timezone)::date - 6 and (now() at time zone a.timezone)::date)::integer as sessions_7d,
    count(*) filter (where local_date between (now() at time zone a.timezone)::date - 29 and (now() at time zone a.timezone)::date)::integer as sessions_30d,
    count(*) filter (where local_date = (now() at time zone a.timezone)::date)::integer as sessions_today,
    max(local_date) as last_training_on,
    max(created_at) as last_training_at
  from public.check_ins where academy_id = s.academy_id and student_id = s.id
) c
cross join lateral (
  select sum(xp_delta) as total_xp from public.gamification_events
  where academy_id = s.academy_id and student_id = s.id
) x;
revoke all on public.student_metrics from anon, authenticated;
grant select on public.student_metrics to authenticated, service_role;
