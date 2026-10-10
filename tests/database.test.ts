import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { DEMO_ACADEMY_ID, makeDemoData } from "../scripts/demo-data";

const db = new PGlite();
const ownerA = randomUUID();
const coachA = randomUUID();
const ownerB = randomUUID();
const studentUser = randomUUID();
let academyA: string;
let academyB: string;
let studentA: string;
let studentB: string;
let ownStudent: string;

async function asUser<T>(id: string, fn: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
  try { return await fn(); } finally { await db.exec("reset role"); }
}
async function createStudent(academy: string, name = "Aluno Teste", email?: string) {
  const { rows } = await db.query<{ id: string }>(
    "select public.register_student($1, $2, 'WHITE', $3) id", [academy, name, email ?? null],
  );
  return rows[0]!.id;
}
async function checkIn(academy: string, student: string) {
  const { rows } = await db.query<{ result: { already_checked_in: boolean; xp_awarded: number; total_xp: number; achievements: string[] } }>(
    "select public.record_check_in($1, $2) result", [academy, student],
  );
  return rows[0]!.result;
}
async function historicalSessions(student: string, count: number) {
  await db.query(`with inserted as (
    insert into public.check_ins(academy_id, student_id, local_date, created_at, recorded_by)
    select $1, $2, (now() at time zone 'America/Sao_Paulo')::date - n,
      now() - make_interval(days => n), $3 from generate_series(1, $4::int) n returning *
  ) insert into public.gamification_events(academy_id, student_id, event_type, xp_delta, check_in_id, created_at)
    select academy_id, student_id, 'CHECK_IN', 10, id, created_at from inserted`, [academyA, student, coachA, count]);
}

beforeAll(async () => {
  // Minimal Auth contract. The migrations themselves are applied unchanged to real PostgreSQL (WASM).
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text unique, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);
  const files = (await readdir("supabase/migrations")).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  for (const [id, email] of [[ownerA, "owner-a@test.local"], [coachA, "coach-a@test.local"], [ownerB, "owner-b@test.local"], [studentUser, "student@test.local"]]) {
    await db.query("insert into auth.users values ($1, $2, now())", [id, email]);
  }
  academyA = await asUser(ownerA, async () => (await db.query<{ id: string }>("select public.create_academy('Academia A') id")).rows[0]!.id);
  academyB = await asUser(ownerB, async () => (await db.query<{ id: string }>("select public.create_academy('Academia B') id")).rows[0]!.id);
  await db.query("insert into public.memberships(academy_id, user_id, role) values ($1, $2, 'COACH')", [academyA, coachA]);
  studentA = await asUser(coachA, () => createStudent(academyA));
  studentB = await asUser(ownerB, () => createStudent(academyB));
  ownStudent = await asUser(coachA, () => createStudent(academyA, "Aluno com login", "student@test.local"));
}, 30000);
afterAll(() => db.close());

describe("migrations, tenant isolation and ledger", () => {
  it("creates the academy and OWNER membership atomically", async () => {
    const { rows } = await db.query("select role from public.memberships where academy_id = $1 and user_id = $2", [academyA, ownerA]);
    expect(rows).toEqual([{ role: "OWNER" }]);
  });
  it("rejects invalid timezone and rolls back academy creation", async () => {
    await expect(asUser(ownerA, () => db.query("select public.create_academy('Bad zone', 'fake/zone')"))).rejects.toThrow("Invalid academy");
  });
  it("isolates academies, memberships, students and metrics", async () => {
    await asUser(coachA, async () => {
      for (const table of ["academies", "memberships", "students", "student_metrics"]) {
        const key = table === "academies" ? "id" : "academy_id";
        expect((await db.query(`select * from public.${table} where ${key} = $1`, [academyB])).rows).toHaveLength(0);
      }
    });
  });
  it("denies cross-tenant student creation and check-in RPCs", async () => {
    await expect(asUser(coachA, () => createStudent(academyB))).rejects.toThrow("staff required");
    await expect(asUser(coachA, () => checkIn(academyB, studentB))).rejects.toThrow("unavailable");
    await expect(asUser(coachA, () => checkIn(academyA, studentB))).rejects.toThrow("unavailable");
  });
  it("awards exactly 10 XP, writes history and unlocks FIRST_ROLL", async () => {
    const result = await asUser(coachA, () => checkIn(academyA, studentA));
    expect(result).toEqual({ already_checked_in: false, xp_awarded: 10, total_xp: 10, achievements: ["FIRST_ROLL"] });
    const { rows } = await asUser(coachA, () => db.query("select total_xp, total_check_ins, sessions_today, sessions_7d, sessions_30d from public.student_metrics where id=$1", [studentA]));
    expect(rows[0]).toEqual({ total_xp: 10, total_check_ins: 1, sessions_today: 1, sessions_7d: 1, sessions_30d: 1 });
  });
  it("makes retries idempotent, without duplicate events or achievements", async () => {
    for (let i = 0; i < 3; i++) expect(await asUser(coachA, () => checkIn(academyA, studentA)))
      .toEqual({ already_checked_in: true, xp_awarded: 0, total_xp: 10, achievements: [] });
    expect((await db.query("select * from public.gamification_events where student_id=$1", [studentA])).rows).toHaveLength(2);
    expect((await db.query("select * from public.student_achievements where student_id=$1", [studentA])).rows).toHaveLength(1);
  });
  it("lets STUDENT read and check in only their own student", async () => {
    await asUser(studentUser, async () => {
      expect((await db.query<{ id: string }>("select id from public.students")).rows).toEqual([{ id: ownStudent }]);
      expect((await db.query<{ id: string }>("select id from public.student_metrics")).rows).toEqual([{ id: ownStudent }]);
      expect((await checkIn(academyA, ownStudent)).xp_awarded).toBe(10);
    });
    await expect(asUser(studentUser, () => checkIn(academyA, studentA))).rejects.toThrow("unavailable");
    await expect(asUser(studentUser, () => createStudent(academyA))).rejects.toThrow("staff required");
  });
  it("hides check-ins, ledger and unlocks across tenants and students", async () => {
    await asUser(ownerB, async () => {
      for (const table of ["check_ins", "gamification_events", "student_achievements"]) {
        expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(0);
      }
    });
    await asUser(studentUser, async () => {
      for (const table of ["check_ins", "gamification_events", "student_achievements"]) {
        expect((await db.query(`select * from public.${table} where student_id=$1`, [studentA])).rows).toHaveLength(0);
      }
    });
  });
  it("denies direct writes, role escalation and catalog edits", async () => {
    for (const sql of [
      `update public.memberships set role='OWNER'`,
      `update public.students set academy_id='${academyB}'`,
      `insert into public.check_ins(academy_id,student_id,local_date,recorded_by) values('${academyA}','${studentA}',current_date,'${coachA}')`,
      `insert into public.gamification_events(academy_id,student_id,event_type,xp_delta) values('${academyA}','${studentA}','CHECK_IN',9999)`,
      "delete from public.student_achievements", "update public.achievements set required_sessions=999",
    ]) await expect(asUser(coachA, () => db.exec(sql))).rejects.toThrow("permission denied");
  });
  it("denies anonymous reads and function execution", async () => {
    await db.exec("set role anon");
    try {
      await expect(db.query("select * from public.students")).rejects.toThrow("permission denied");
      await expect(db.query("select public.create_academy('Unauthorized')")).rejects.toThrow("permission denied");
      await expect(db.query("select public.record_check_in($1,$2)", [academyA, studentA])).rejects.toThrow("permission denied");
    } finally { await db.exec("reset role"); }
  });
  it("enforces composite foreign keys even for privileged inserts", async () => {
    await expect(db.query(`insert into public.check_ins(academy_id,student_id,local_date,recorded_by)
      values($1,$2,current_date,$3)`, [academyA, studentB, coachA])).rejects.toThrow("foreign key");
  });
  it("keeps historical rows immutable even for privileged users", async () => {
    for (const table of ["check_ins", "gamification_events", "student_achievements"])
      await expect(db.query(`delete from public.${table} where student_id=$1`, [studentA])).rejects.toThrow("append-only");
  });
  it.each([10, 30])("unlocks the %i session milestone without bonus XP", async (target) => {
    const student = await asUser(coachA, () => createStudent(academyA, `Marco ${target}`));
    await historicalSessions(student, target - 1);
    const result = await asUser(coachA, () => checkIn(academyA, student));
    expect(result.total_xp).toBe(target * 10);
    expect(result.achievements).toContain(target === 10 ? "TEN_SESSIONS" : "THIRTY_SESSIONS");
    expect((await asUser(coachA, () => checkIn(academyA, student))).achievements).toEqual([]);
  });
  it("rolls back presence and XP if the achievement operation fails", async () => {
    const student = await asUser(coachA, () => createStudent(academyA, "Rollback"));
    await db.exec(`create function private.test_failure() returns trigger language plpgsql as $$
      begin raise exception 'injected failure'; end; $$;
      create trigger fail_unlock before insert on public.student_achievements for each row execute function private.test_failure();`);
    try {
      await expect(asUser(coachA, () => checkIn(academyA, student))).rejects.toThrow("injected failure");
      expect((await db.query("select * from public.check_ins where student_id=$1", [student])).rows).toHaveLength(0);
      expect((await db.query("select * from public.gamification_events where student_id=$1", [student])).rows).toHaveLength(0);
    } finally { await db.exec("drop trigger fail_unlock on public.student_achievements; drop function private.test_failure()"); }
  });
  it("counts 7/30 calendar-day windows inclusively without inflating ledger totals", async () => {
    const student = await asUser(coachA, () => createStudent(academyA, "Janelas"));
    await historicalSessions(student, 31);
    await asUser(coachA, () => checkIn(academyA, student));
    const { rows } = await asUser(coachA, () => db.query("select total_xp,total_check_ins,sessions_7d,sessions_30d from public.student_metrics where id=$1", [student]));
    expect(rows[0]).toEqual({ total_xp: 320, total_check_ins: 32, sessions_7d: 7, sessions_30d: 30 });
  });
  it("prevents binding an academy staff account as STUDENT", async () => {
    await expect(asUser(coachA, () => createStudent(academyA, "Bad link", "owner-a@test.local"))).rejects.toThrow("already academy staff");
    expect((await db.query("select role from public.memberships where academy_id=$1 and user_id=$2", [academyA, ownerA])).rows[0]).toEqual({ role: "OWNER" });
  });
  it("loads the complete demo twice with valid FKs and without overwriting history", async () => {
    const { rows: dates } = await db.query<{ today: string }>("select to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') today");
    const fixture = makeDemoData(dates[0]!.today, coachA, studentUser);
    await db.query("insert into public.academies(id,name,created_by) values($1,'Black Lotus Jiu-Jitsu',$2)", [DEMO_ACADEMY_ID, ownerA]);
    await db.query("insert into public.memberships(academy_id,user_id,role) values($1,$2,'OWNER'),($1,$3,'COACH'),($1,$4,'STUDENT')", [DEMO_ACADEMY_ID, ownerA, coachA, studentUser]);
    await db.exec("set role service_role");
    try {
      for (let pass = 0; pass < 2; pass++) {
        for (const [table, records] of [
          ["students", fixture.students], ["check_ins", fixture.checkIns],
          ["student_achievements", fixture.unlocks], ["gamification_events", fixture.events],
        ] as const) {
          await db.query(`insert into public.${table} select * from jsonb_populate_recordset(null::public.${table}, $1::jsonb) on conflict do nothing`, [JSON.stringify(records)]);
        }
      }
    } finally { await db.exec("reset role"); }
    const { rows } = await asUser(coachA, () => db.query<{ total_check_ins: number; total_xp: number }>("select total_check_ins,total_xp from public.student_metrics where academy_id=$1", [DEMO_ACADEMY_ID]));
    expect(rows).toHaveLength(10);
    for (const row of rows) expect(row.total_xp).toBe(row.total_check_ins * 10);
    expect(rows.reduce((sum, row) => sum + row.total_check_ins, 0)).toBe(fixture.checkIns.length);
  });
});

describe("subsequent student access", () => {
  const linkedUser = randomUUID();
  const otherUser = randomUUID();
  const unconfirmedUser = randomUUID();
  let existingStudent: string;
  let unlinkedStudent: string;
  async function link(academy: string, student: string, email: string) {
    return db.query("select public.link_student_access($1,$2,$3) id", [academy, student, email]);
  }
  beforeAll(async () => {
    for (const [id, email, confirmed] of [
      [linkedUser, "linked@test.local", true], [otherUser, "other@test.local", true],
      [unconfirmedUser, "unconfirmed@test.local", false],
    ] as const) await db.query("insert into auth.users values ($1,$2,$3)", [id, email, confirmed ? new Date().toISOString() : null]);
    existingStudent = await asUser(coachA, () => createStudent(academyA, "aluno teste"));
    unlinkedStudent = await asUser(coachA, () => createStudent(academyA, "Outro aluno"));
    await asUser(coachA, () => checkIn(academyA, existingStudent));
  });
  it("normalizes email and preserves the same student, 10 XP, one session and FIRST_ROLL", async () => {
    const history = (await db.query("select * from public.gamification_events where student_id=$1 order by id", [existingStudent])).rows;
    const before = (await db.query<Record<string, unknown>>("select * from public.students where id=$1", [existingStudent])).rows[0]!;
    await asUser(coachA, () => link(academyA, existingStudent, "  LINKED@TEST.LOCAL  "));
    expect((await db.query("select * from public.students where id=$1", [existingStudent])).rows[0]).toEqual({ ...before, user_id: linkedUser });
    expect((await db.query("select * from public.gamification_events where student_id=$1 order by id", [existingStudent])).rows).toEqual(history);
    await asUser(linkedUser, async () => {
      expect((await db.query("select total_xp,total_check_ins from public.student_metrics where id=$1", [existingStudent])).rows).toEqual([{ total_xp: 10, total_check_ins: 1 }]);
      expect((await db.query("select achievement_code from public.student_achievements where student_id=$1", [existingStudent])).rows).toEqual([{ achievement_code: "FIRST_ROLL" }]);
      expect((await db.query("select role from public.memberships where academy_id=$1 and user_id=$2", [academyA, linkedUser])).rows).toEqual([{ role: "STUDENT" }]);
      expect((await db.query("select id from public.academies")).rows).toEqual([{ id: academyA }]);
      expect((await db.query("select id from public.students")).rows).toEqual([{ id: existingStudent }]);
      expect((await checkIn(academyA, existingStudent)).xp_awarded).toBe(0);
    });
  });
  it("is idempotent for the same confirmed account", async () => {
    await asUser(ownerA, () => link(academyA, existingStudent, "linked@test.local"));
    expect((await db.query("select * from public.memberships where academy_id=$1 and user_id=$2", [academyA, linkedUser])).rows).toHaveLength(1);
  });
  it("rejects changing an existing link without creating a membership", async () => {
    await expect(asUser(coachA, () => link(academyA, existingStudent, "other@test.local"))).rejects.toThrow("already linked");
    expect((await db.query("select * from public.memberships where academy_id=$1 and user_id=$2", [academyA, otherUser])).rows).toHaveLength(0);
  });
  it("rejects one account linked to two students in the same academy", async () => {
    await expect(asUser(coachA, () => link(academyA, unlinkedStudent, "linked@test.local"))).rejects.toThrow("another student");
    expect((await db.query("select user_id from public.students where id=$1", [unlinkedStudent])).rows).toEqual([{ user_id: null }]);
    await expect(asUser(coachA, () => createStudent(academyA, "Duplicado", "linked@test.local"))).rejects.toThrow("another student");
    expect((await db.query("select id from public.students where full_name='Duplicado'")).rows).toHaveLength(0);
  });
  it("blocks cross-tenant and mismatched student IDs before auth lookup", async () => {
    await expect(asUser(coachA, () => link(academyB, studentB, "linked@test.local"))).rejects.toThrow("staff required");
    await expect(asUser(coachA, () => link(academyA, studentB, "linked@test.local"))).rejects.toThrow("unavailable");
    await expect(asUser(coachA, () => link(academyA, randomUUID(), "missing@test.local"))).rejects.toThrow("unavailable");
  });
  it("does not give students staff powers or access to another student's data", async () => {
    await expect(asUser(linkedUser, () => link(academyA, unlinkedStudent, "other@test.local"))).rejects.toThrow("staff required");
    await expect(asUser(linkedUser, () => createStudent(academyA))).rejects.toThrow("staff required");
    await expect(asUser(linkedUser, () => checkIn(academyA, unlinkedStudent))).rejects.toThrow("unavailable");
    await asUser(linkedUser, async () => {
      expect((await db.query("select * from public.student_metrics where id=$1", [unlinkedStudent])).rows).toHaveLength(0);
      await expect(db.query("select email from auth.users")).rejects.toThrow("permission denied");
      await expect(db.query("select private.link_student_access($1,$2,$3,false)", [academyA, unlinkedStudent, "other@test.local"])).rejects.toThrow("permission denied");
      await expect(db.query("update public.students set user_id=$1 where id=$2", [linkedUser, unlinkedStudent])).rejects.toThrow("permission denied");
    });
  });
  it("denies anonymous execution", async () => {
    await db.exec("set role anon");
    try { await expect(link(academyA, unlinkedStudent, "other@test.local")).rejects.toThrow("permission denied"); }
    finally { await db.exec("reset role"); }
  });
  it.each(["missing@test.local", "unconfirmed@test.local"])("requires a confirmed account for subsequent link: %s", async (email) => {
    await expect(asUser(coachA, () => link(academyA, unlinkedStudent, email))).rejects.toThrow("confirmed account");
    expect((await db.query("select user_id from public.students where id=$1", [unlinkedStudent])).rows).toEqual([{ user_id: null }]);
  });
  it("rejects staff accounts without changing their role", async () => {
    await expect(asUser(coachA, () => link(academyA, unlinkedStudent, "owner-a@test.local"))).rejects.toThrow("already academy staff");
    expect((await db.query("select role from public.memberships where academy_id=$1 and user_id=$2", [academyA, ownerA])).rows).toEqual([{ role: "OWNER" }]);
  });
  it("preserves registrations when an account is missing or unconfirmed, then links later", async () => {
    const missing = await asUser(coachA, () => createStudent(academyA, "Sem conta", "missing@test.local"));
    const pending = await asUser(coachA, () => createStudent(academyA, "Confirmar depois", "unconfirmed@test.local"));
    for (const id of [missing, pending]) expect((await db.query("select user_id from public.students where id=$1", [id])).rows).toEqual([{ user_id: null }]);
    await db.query("update auth.users set email_confirmed_at=now() where id=$1", [unconfirmedUser]);
    await asUser(coachA, () => link(academyA, pending, "unconfirmed@test.local"));
    expect((await db.query("select user_id from public.students where id=$1", [pending])).rows).toEqual([{ user_id: unconfirmedUser }]);
  });
  it("links confirmed accounts on registration using the same rules", async () => {
    const id = await asUser(coachA, () => createStudent(academyA, "Novo com conta", " OTHER@TEST.LOCAL "));
    expect((await db.query("select user_id from public.students where id=$1", [id])).rows).toEqual([{ user_id: otherUser }]);
  });
  it("allows the same student account in a second academy with isolated records", async () => {
    const second = await asUser(ownerB, () => createStudent(academyB, "Aluno na B"));
    await asUser(ownerB, () => link(academyB, second, "linked@test.local"));
    await asUser(linkedUser, async () => {
      expect((await db.query("select id from public.students order by id")).rows).toEqual([{ id: existingStudent }, { id: second }].sort((a, b) => a.id.localeCompare(b.id)));
      expect((await db.query("select * from public.students where id=$1", [studentB])).rows).toHaveLength(0);
    });
  });
  it("rejects malformed email without changing the student", async () => {
    await expect(asUser(coachA, () => link(academyA, unlinkedStudent, "not-an-email"))).rejects.toThrow("Invalid student email");
  });
});
