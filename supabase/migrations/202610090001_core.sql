-- Dojo OS V0.1. auth.users is managed by Supabase Auth.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.academy_role as enum ('OWNER', 'COACH', 'STUDENT');
create type public.belt as enum ('WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK');
create type public.gamification_event_type as enum ('CHECK_IN', 'ACHIEVEMENT_UNLOCKED');

create table public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 100),
  timezone text not null default 'America/Sao_Paulo',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.memberships (
  academy_id uuid not null references public.academies(id),
  user_id uuid not null references auth.users(id),
  role public.academy_role not null,
  created_at timestamptz not null default now(),
  primary key (academy_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id, academy_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id),
  user_id uuid,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 100),
  belt public.belt not null default 'WHITE',
  created_at timestamptz not null default now(),
  unique (academy_id, id),
  unique (academy_id, user_id),
  foreign key (academy_id, user_id) references public.memberships(academy_id, user_id)
);
create index students_academy_name_idx on public.students(academy_id, full_name, id);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null,
  student_id uuid not null,
  local_date date not null,
  created_at timestamptz not null default now(),
  recorded_by uuid not null,
  foreign key (academy_id, student_id) references public.students(academy_id, id),
  foreign key (academy_id, recorded_by) references public.memberships(academy_id, user_id),
  unique (academy_id, student_id, local_date),
  unique (academy_id, student_id, id)
);
create index check_ins_academy_day_idx on public.check_ins(academy_id, local_date desc);

-- Global, read-only catalog: no academy-owned data here.
create table public.achievements (
  code text primary key,
  name text not null,
  description text not null,
  required_sessions integer not null unique check (required_sessions > 0)
);
insert into public.achievements values
  ('FIRST_ROLL', 'Primeiro passo', 'Primeiro treino registrado.', 1),
  ('TEN_SESSIONS', 'Criando constância', '10 treinos registrados.', 10),
  ('THIRTY_SESSIONS', 'Presença de respeito', '30 treinos registrados.', 30);

create table public.student_achievements (
  academy_id uuid not null,
  student_id uuid not null,
  achievement_code text not null references public.achievements(code),
  unlocked_at timestamptz not null default now(),
  primary key (academy_id, student_id, achievement_code),
  foreign key (academy_id, student_id) references public.students(academy_id, id)
);

create table public.gamification_events (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null,
  student_id uuid not null,
  event_type public.gamification_event_type not null,
  xp_delta integer not null,
  check_in_id uuid,
  achievement_code text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  foreign key (academy_id, student_id) references public.students(academy_id, id),
  foreign key (academy_id, student_id, check_in_id) references public.check_ins(academy_id, student_id, id),
  foreign key (academy_id, student_id, achievement_code)
    references public.student_achievements(academy_id, student_id, achievement_code),
  unique (academy_id, check_in_id),
  unique (academy_id, student_id, achievement_code),
  check (
    (event_type = 'CHECK_IN' and xp_delta = 10 and check_in_id is not null and achievement_code is null)
    or
    (event_type = 'ACHIEVEMENT_UNLOCKED' and xp_delta = 0 and check_in_id is null and achievement_code is not null)
  )
);
create index gamification_events_student_idx
  on public.gamification_events(academy_id, student_id, created_at desc, id);

create function private.member_role(p_academy_id uuid)
returns public.academy_role language sql stable security definer set search_path = '' as $$
  select role from public.memberships
  where academy_id = p_academy_id and user_id = (select auth.uid());
$$;

create function private.can_read_student(p_academy_id uuid, p_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    join public.students s on s.academy_id = m.academy_id
    where m.academy_id = p_academy_id and s.id = p_student_id
      and m.user_id = (select auth.uid())
      and (m.role in ('OWNER', 'COACH') or s.user_id = m.user_id)
  );
$$;
revoke all on function private.member_role(uuid) from public, anon;
revoke all on function private.can_read_student(uuid, uuid) from public, anon;
grant execute on function private.member_role(uuid), private.can_read_student(uuid, uuid) to authenticated;

alter table public.academies enable row level security;
alter table public.memberships enable row level security;
alter table public.students enable row level security;
alter table public.check_ins enable row level security;
alter table public.achievements enable row level security;
alter table public.student_achievements enable row level security;
alter table public.gamification_events enable row level security;

create policy academies_read on public.academies for select to authenticated
  using (private.member_role(id) is not null);
create policy memberships_read on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.member_role(academy_id) in ('OWNER', 'COACH'));
create policy students_read on public.students for select to authenticated
  using (private.can_read_student(academy_id, id));
create policy check_ins_read on public.check_ins for select to authenticated
  using (private.can_read_student(academy_id, student_id));
create policy events_read on public.gamification_events for select to authenticated
  using (private.can_read_student(academy_id, student_id));
create policy unlocks_read on public.student_achievements for select to authenticated
  using (private.can_read_student(academy_id, student_id));
create policy achievements_read on public.achievements for select to authenticated using (true);

-- No table writes for web clients, even if a Supabase project's default grants are broad.
revoke all on public.academies, public.memberships, public.students, public.check_ins,
  public.achievements, public.student_achievements, public.gamification_events from anon, authenticated;
grant select on public.academies, public.memberships, public.students, public.check_ins,
  public.achievements, public.student_achievements, public.gamification_events to authenticated;
grant all on public.academies, public.memberships, public.students, public.check_ins,
  public.achievements, public.student_achievements, public.gamification_events to service_role;

create function private.reject_history_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Historical records are append-only' using errcode = '42501';
end;
$$;
revoke all on function private.reject_history_mutation() from public, anon, authenticated;
create trigger immutable_events before update or delete on public.gamification_events
  for each row execute function private.reject_history_mutation();
create trigger immutable_check_ins before update or delete on public.check_ins
  for each row execute function private.reject_history_mutation();
create trigger immutable_unlocks before update or delete on public.student_achievements
  for each row execute function private.reject_history_mutation();
