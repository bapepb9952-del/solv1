// Integration tests against the local Supabase Docker container, never a hosted project.
// Every db() call uses a distinct PostgreSQL connection. Fixtures remain for inspection.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
const container = 'supabase_db_dojo-os';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function db(sql, marker) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-qAt', '-v', 'ON_ERROR_STOP=1']);
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; if (output.includes('QR_TEST_LOCKED')) marker?.(); });
    // Do not log SQL, tokens, auth fixture details or raw server errors.
    child.stderr.resume();
    child.on('error', () => reject(new Error('Local Docker/PostgreSQL unavailable')));
    child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error('PostgreSQL test command rejected')));
    child.stdin.end(sql);
  });
}
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
async function rpc(actor, name, args) {
  const output = await db(`begin; select set_config('request.jwt.claim.sub',${quote(actor)},true); set local role authenticated; select public.${name}(${args.map(quote).join(',')}); commit;`);
  const value = output.split('\n').find(line => line.startsWith('{'));
  return value ? JSON.parse(value) : output.split('\n').at(-1);
}
const user = async () => {
  const id = randomUUID();
  await db(`insert into auth.users(id,email,email_confirmed_at) values(${quote(id)},${quote(`qr-${id}@test.local`)},now());`);
  return id;
};
async function fixture() {
  const owner = await user(), coach = await user(), pupil = await user();
  const academy = await rpc(owner,'create_academy',['QR integration fixture']);
  await db(`insert into public.memberships(academy_id,user_id,role) values(${quote(academy)},${quote(coach)},'COACH');`);
  const student = await rpc(owner,'register_student',[academy,'Aluno QR fixture','WHITE',`qr-${pupil}@test.local`]);
  return {owner,coach,pupil,academy,student};
}
const issue = f => rpc(f.pupil,'issue_check_in_qr',[f.academy,f.student]);
const redeem = (f,token,actor=f.coach) => rpc(actor,'redeem_check_in_qr',[f.academy,token]);
async function verify(f, count) {
  const result = await db(`select count(*)||':'||coalesce(sum(xp_delta),0) from public.gamification_events where academy_id=${quote(f.academy)} and student_id=${quote(f.student)} and event_type='CHECK_IN';`);
  assert(result === `${count}:${count*10}`, 'Presence ledger count or XP mismatch');
  const presences = await db(`select count(*) from public.check_ins where academy_id=${quote(f.academy)} and student_id=${quote(f.student)};`);
  assert(presences === String(count), 'Daily presence duplicate');
}

const f = await fixture();
let qr = await issue(f);
const concurrent = await Promise.all([redeem(f,qr.token,f.coach),redeem(f,qr.token,f.owner)]);
assert(concurrent.filter(r => r.xp_awarded===10).length===1, 'Concurrent consumption must award once');
assert(concurrent.some(r => r.error_code==='Q0003'), 'Replay must be rejected');
await verify(f,1);
console.log('PASS: concurrent redemption by two staff connections, replay, one presence and 10 XP');

const manual = await fixture(); qr = await issue(manual);
await Promise.all([redeem(manual,qr.token),rpc(manual.owner,'record_check_in',[manual.academy,manual.student])]);
await verify(manual,1);
console.log('PASS: QR versus manual check-in race');

const renewal = await fixture(); const old = await issue(renewal);
await db(`update private.check_in_qr_tokens set issued_at=issued_at-interval '6 seconds',expires_at=expires_at-interval '6 seconds' where id=${quote(old.id)};`);
const [,fresh] = await Promise.all([redeem(renewal,old.token),issue(renewal)]);
await redeem(renewal,fresh.token);
await verify(renewal,1);
console.log('PASS: concurrent renewal/redemption, different tokens and consistent lock ordering');

const expiry = await fixture(); qr = await issue(expiry);
// Use a single timestamp to preserve the 120-second constraint exactly.
await db(`with moment as (select clock_timestamp() t) update private.check_in_qr_tokens set issued_at=t-interval '119 seconds',expires_at=t+interval '1 second' from moment where id=${quote(qr.id)};`);
let ready;
const locked = new Promise(resolve => { ready = resolve; });
const blocker = db(`begin; select id from public.students where id=${quote(expiry.student)} for update; select 'QR_TEST_LOCKED'; select pg_sleep(2); commit;`, ready);
await locked;
const expired = await redeem(expiry,qr.token);
await blocker;
assert(expired.error_code==='Q0002','Expiration must be rechecked after lock wait');
await verify(expiry,0);
console.log('PASS: server expiry including wait on another connection');

const isolated = await fixture(); qr = await issue(isolated);
const outsider = await fixture();
assert((await rpc(outsider.owner,'redeem_check_in_qr',[outsider.academy,qr.token])).error_code==='Q0001','Cross-academy token must fail');
let denied=false;
try { await redeem(isolated,qr.token,isolated.pupil); } catch { denied=true; }
assert(denied,'Student cannot redeem own QR');
await verify(isolated,0);
console.log('PASS: tenant isolation and STUDENT redemption denial');

const rollback = await fixture(); qr = await issue(rollback);
const trigger = 'qr_failure_'+randomUUID().replaceAll('-','');
await db(`create function private.${trigger}() returns trigger language plpgsql as $$ begin if NEW.student_id=${quote(rollback.student)}::uuid then raise exception 'injected failure'; end if; return NEW; end; $$; create trigger ${trigger} before insert on public.student_achievements for each row execute function private.${trigger}();`);
try {
  let failed=false; try { await redeem(rollback,qr.token); } catch { failed=true; }
  assert(failed,'Injected achievement failure must abort');
  await verify(rollback,0);
  assert((await db(`select consumed_at is null from private.check_in_qr_tokens where id=${quote(qr.id)};`))==='t','Consumption must roll back');
  assert((await db(`select count(*) from public.gamification_events where student_id=${quote(rollback.student)};`))==='0','All ledger writes must roll back');
} finally { await db(`drop trigger ${trigger} on public.student_achievements; drop function private.${trigger}();`); }
assert((await redeem(rollback,qr.token)).xp_awarded===10,'Same token remains usable after rollback');
console.log('PASS: rollback of token, presence, ledger and achievements; successful retry');
