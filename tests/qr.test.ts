import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { QR_PREFIX, qrTokenSchema } from "../src/features/check-ins/qr-schema";

const db = new PGlite();
const owner = randomUUID(), coach = randomUUID(), pupil = randomUUID(), stranger = randomUUID(), otherOwner = randomUUID();
let academy: string, otherAcademy: string, student: string;
type Result = { token: string; id: string; server_now: string; expires_at: string; error_code?: string; xp_awarded?: number; already_checked_in?: boolean; achievements?: string[]; consumed?: boolean };
async function asUser<T>(id: string, fn: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
  try { return await fn(); } finally { await db.exec("reset role"); }
}
async function rpc(name: string, args: unknown[]) {
  return (await db.query<{ result: Result }>(`select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) result`, args)).rows[0]!.result;
}
const issue = () => asUser(pupil, () => rpc("issue_check_in_qr", [academy, student]));
const redeem = (token: string, who = coach, tenant = academy) => asUser(who, () => rpc("redeem_check_in_qr", [tenant, token]));
const preview = (token: string) => asUser(coach, () => rpc("preview_check_in_qr", [academy, token]));
async function reset() {
  // Token/limiter fixtures only; never erase application history.
  await db.exec("delete from private.check_in_qr_tokens; delete from private.check_in_qr_scan_limits;");
}
beforeAll(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text unique,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;`);
  for (const file of (await readdir("supabase/migrations")).filter((f) => f.endsWith(".sql")).sort()) await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  for (const [id, email] of [[owner,"owner@test.local"],[coach,"coach@test.local"],[pupil,"pupil@test.local"],[stranger,"stranger@test.local"],[otherOwner,"other@test.local"]]) await db.query("insert into auth.users values($1,$2,now())", [id,email]);
  academy = (await asUser(owner, () => db.query<{ id: string }>("select public.create_academy('QR A') id"))).rows[0]!.id;
  otherAcademy = (await asUser(otherOwner, () => db.query<{ id: string }>("select public.create_academy('QR B') id"))).rows[0]!.id;
  await db.query("insert into public.memberships(academy_id,user_id,role) values($1,$2,'COACH')", [academy,coach]);
  student = (await asUser(owner, () => db.query<{ id: string }>("select public.register_student($1,'QR aluno','WHITE','pupil@test.local') id", [academy]))).rows[0]!.id;
});
afterAll(() => db.close());

describe("QR, tenant authorization and atomic presence", () => {
  it("stores only SHA-256 and fixes expiration to 120 server seconds", async () => {
    const qr = await issue();
    expect(qr.token).toMatch(/^[0-9a-f]{64}$/);
    expect(Date.parse(qr.expires_at)-Date.parse(qr.server_now)).toBe(120000);
    const row = (await db.query<{ token_hash: string }>("select token_hash from private.check_in_qr_tokens where id=$1", [qr.id])).rows[0]!;
    expect(row.token_hash).toBe(createHash("sha256").update(qr.token).digest("hex"));
    expect(row.token_hash).not.toBe(qr.token);
    await expect(asUser(pupil, () => db.query("select * from private.check_in_qr_tokens"))).rejects.toThrow("permission denied");
    await expect(issue()).rejects.toThrow("rate limit");
  });
  it("allows only the linked STUDENT to issue", async () => {
    for (const who of [owner,coach,stranger,otherOwner]) await expect(asUser(who, () => rpc("issue_check_in_qr", [academy,student]))).rejects.toThrow("Own student required");
    await expect(asUser(pupil, () => rpc("issue_check_in_qr", [otherAcademy,student]))).rejects.toThrow("Own student required");
  });
  it("previews without consuming, then writes 10 XP and FIRST_ROLL atomically", async () => {
    await reset(); const qr = await issue();
    const name = await preview(qr.token);
    expect(name).toMatchObject({ student_name: "QR aluno", student_id: student });
    expect((await db.query("select consumed_at from private.check_in_qr_tokens where id=$1", [qr.id])).rows).toEqual([{ consumed_at: null }]);
    const result = await redeem(qr.token);
    expect(result).toMatchObject({ xp_awarded: 10, already_checked_in: false, achievements: ["FIRST_ROLL"] });
    const metrics = await asUser(pupil, () => db.query("select total_xp,total_check_ins,belt from public.student_metrics where id=$1", [student]));
    expect(metrics.rows).toEqual([{ total_xp: 10, total_check_ins: 1, belt: "WHITE" }]);
    expect(await redeem(qr.token)).toEqual({ error_code: "Q0003" });
    expect(await asUser(pupil, () => rpc("check_in_qr_status", [academy,qr.id]))).toMatchObject({ consumed: true });
  });
  it("consumes a new token without duplicating a manual/daily presence", async () => {
    await reset(); const qr = await issue();
    await asUser(coach, () => rpc("record_check_in", [academy,student]));
    expect(await redeem(qr.token,owner)).toMatchObject({ xp_awarded: 0, already_checked_in: true });
    expect((await db.query("select count(*)::int n from public.check_ins where student_id=$1", [student])).rows).toEqual([{ n: 1 }]);
  });
  it("rejects expired, changed, malformed and cross-tenant tokens", async () => {
    await reset(); const qr = await issue();
    for (const token of ["not-a-token", "0".repeat(64)]) expect(await redeem(token)).toEqual({ error_code: "Q0001" });
    expect(await redeem(qr.token,otherOwner,otherAcademy)).toEqual({ error_code: "Q0001" });
    await expect(redeem(qr.token,pupil)).rejects.toThrow("staff required");
    await db.query("update private.check_in_qr_tokens set issued_at=issued_at-interval '121 seconds',expires_at=expires_at-interval '121 seconds' where id=$1", [qr.id]);
    expect(await redeem(qr.token)).toEqual({ error_code: "Q0002" });
    expect((await db.query("select consumed_at from private.check_in_qr_tokens where id=$1", [qr.id])).rows).toEqual([{ consumed_at: null }]);
  });
  it("renewal revokes the previous token and limits invalid scans persistently", async () => {
    await reset(); const old = await issue();
    await db.query("update private.check_in_qr_tokens set issued_at=issued_at-interval '6 seconds',expires_at=expires_at-interval '6 seconds' where id=$1", [old.id]);
    const fresh = await issue();
    expect(await redeem(old.token)).toEqual({ error_code: "Q0004" });
    expect(await preview(fresh.token)).toMatchObject({ student_id: student });
    for (let i=0;i<58;i++) expect(await preview("0".repeat(64))).toEqual({ error_code: "Q0001" });
    expect(await preview(fresh.token)).toEqual({ error_code: "Q0005" });
  });
  it("rechecks the issuer's current account link and staff role", async () => {
    await reset(); const qr = await issue();
    await db.query("update public.students set user_id=null where id=$1", [student]);
    expect(await redeem(qr.token)).toEqual({ error_code: "42501" });
    await db.query("update public.students set user_id=$1 where id=$2", [pupil,student]);
    await db.query("update public.memberships set role='STUDENT' where academy_id=$1 and user_id=$2", [academy,coach]);
    await expect(redeem(qr.token)).rejects.toThrow("staff required");
    await db.query("update public.memberships set role='COACH' where academy_id=$1 and user_id=$2", [academy,coach]);
    await expect(asUser(stranger, () => rpc("check_in_qr_status", [academy,qr.id]))).rejects.toThrow("Own student required");
  });
  it("rolls back consumption, presence and ledger when achievement insertion fails", async () => {
    await reset();
    const account = randomUUID();
    await db.query("insert into auth.users values($1,'rollback@test.local',now())", [account]);
    const id = (await asUser(owner, () => db.query<{ id: string }>("select public.register_student($1,'Rollback','WHITE','rollback@test.local') id", [academy]))).rows[0]!.id;
    const qr = await asUser(account, () => rpc("issue_check_in_qr", [academy,id]));
    await db.exec(`create function private.qr_test_fail() returns trigger language plpgsql as $$ begin raise exception 'injected QR failure'; end; $$;
      create trigger qr_test_fail before insert on public.student_achievements for each row execute function private.qr_test_fail();`);
    try {
      await expect(redeem(qr.token)).rejects.toThrow("injected QR failure");
      for (const table of ["check_ins","gamification_events","student_achievements"]) expect((await db.query(`select * from public.${table} where student_id=$1`, [id])).rows).toHaveLength(0);
      expect((await db.query("select consumed_at from private.check_in_qr_tokens where id=$1", [qr.id])).rows).toEqual([{ consumed_at: null }]);
    } finally { await db.exec("drop trigger qr_test_fail on public.student_achievements; drop function private.qr_test_fail()"); }
    expect(await redeem(qr.token)).toMatchObject({ xp_awarded: 10 });
  });
  it("denies anonymous RPCs and direct token writes", async () => {
    await db.exec("set role anon");
    try { await expect(rpc("issue_check_in_qr", [academy,student])).rejects.toThrow("permission denied"); }
    finally { await db.exec("reset role"); }
    await expect(asUser(pupil, () => db.exec("delete from private.check_in_qr_tokens"))).rejects.toThrow("permission denied");
    await expect(asUser(coach, () => db.query("select private.validate_check_in_qr($1,$2)", [academy,"0".repeat(64)]))).rejects.toThrow("permission denied");
  });
  it("only decodes the versioned payload or an exact token, never URLs or user data", () => {
    expect(qrTokenSchema.parse(QR_PREFIX+"a".repeat(64))).toBe("a".repeat(64));
    for (const value of ["https://example.test/?token="+"a".repeat(64),"email@test.local",QR_PREFIX+"a".repeat(65)]) expect(qrTokenSchema.safeParse(value).success).toBe(false);
  });
});
