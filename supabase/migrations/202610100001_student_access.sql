-- Bind an existing student without changing their identity, tenant or history.
-- The private helper is shared by registration and subsequent access linking.
begin;
create function private.link_student_access(
  p_academy_id uuid, p_student_id uuid, p_email text, p_allow_missing boolean default false
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
  v_user_id uuid;
  v_existing_user_id uuid;
  v_role public.academy_role;
begin
  if coalesce(private.member_role(p_academy_id)::text, '') not in ('OWNER', 'COACH') then
    raise exception 'Academy staff required' using errcode = '42501';
  end if;
  select user_id into v_existing_user_id from public.students
    where academy_id = p_academy_id and id = p_student_id for update;
  if not found then
    raise exception 'Student unavailable' using errcode = '42501';
  end if;
  if v_email is null or char_length(v_email) > 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid student email' using errcode = '22023';
  end if;
  -- Exact lookup stays inside PostgreSQL; never return auth.users data or lists.
  select id into v_user_id from auth.users
    where lower(email) = v_email and email_confirmed_at is not null;
  if v_user_id is null then
    if p_allow_missing then return false; end if;
    raise exception 'Student needs a confirmed account' using errcode = 'P0002';
  end if;
  if v_existing_user_id is not null and v_existing_user_id <> v_user_id then
    raise exception 'Student access already linked' using errcode = 'P0003';
  end if;
  insert into public.memberships(academy_id, user_id, role)
    values (p_academy_id, v_user_id, 'STUDENT') on conflict do nothing;
  -- Serialize links for the same account, even when two different students are targeted.
  select role into v_role from public.memberships
    where academy_id = p_academy_id and user_id = v_user_id for update;
  if v_role <> 'STUDENT' then
    raise exception 'This account is already academy staff' using errcode = '22023';
  end if;
  if exists (select 1 from public.students
    where academy_id = p_academy_id and user_id = v_user_id and id <> p_student_id) then
    raise exception 'Account already linked to another student' using errcode = '23505';
  end if;
  -- Existing unique (academy_id,user_id) and composite FK are the final safeguards.
  update public.students set user_id = v_user_id
    where academy_id = p_academy_id and id = p_student_id;
  return true;
end;
$$;
revoke all on function private.link_student_access(uuid, uuid, text, boolean)
  from public, anon, authenticated;

create function public.link_student_access(p_academy_id uuid, p_student_id uuid, p_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform private.link_student_access(p_academy_id, p_student_id, p_email, false);
  return p_student_id;
end;
$$;
revoke all on function public.link_student_access(uuid, uuid, text) from public, anon;
grant execute on function public.link_student_access(uuid, uuid, text) to authenticated;

create or replace function public.register_student(
  p_academy_id uuid, p_full_name text, p_belt public.belt default 'WHITE', p_email text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if coalesce(private.member_role(p_academy_id)::text, '') not in ('OWNER', 'COACH') then
    raise exception 'Academy staff required' using errcode = '42501';
  end if;
  if p_full_name is null or char_length(btrim(p_full_name)) not between 2 and 100 or p_belt is null then
    raise exception 'Invalid student details' using errcode = '22023';
  end if;
  insert into public.students(academy_id, full_name, belt)
    values (p_academy_id, btrim(p_full_name), p_belt) returning id into v_id;
  if nullif(btrim(p_email), '') is not null then
    -- Missing/unconfirmed accounts do not invalidate the student's registration.
    -- Staff can link access later once the account is confirmed.
    perform private.link_student_access(p_academy_id, v_id, p_email, true);
  end if;
  return v_id;
end;
$$;
revoke all on function public.register_student(uuid, text, public.belt, text) from public, anon;
grant execute on function public.register_student(uuid, text, public.belt, text) to authenticated;
commit;
