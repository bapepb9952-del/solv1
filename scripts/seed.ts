import { createClient, type User } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { DEMO_ACADEMY_ID, DEMO_ACCOUNTS, DEMO_TIMEZONE, makeDemoData } from "./demo-data";
import { dateInZone } from "../src/lib/dates";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.DEMO_PASSWORD;
  if (process.env.SEED_DEMO !== "true") throw new Error("Defina SEED_DEMO=true em .env.local para popular este projeto com dados fictícios.");
  if (!url || !key || key.startsWith("replace-")) throw new Error("Configure a URL e SUPABASE_SERVICE_ROLE_KEY em .env.local.");
  if (!password || password.length < 12 || password.startsWith("choose-a-")) throw new Error("Defina DEMO_PASSWORD com uma senha própria de pelo menos 12 caracteres.");
  const admin = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 100) break;
  }
  const ids: Record<string, string> = {};
  for (const account of DEMO_ACCOUNTS) {
    const existing = users.find((user) => user.email === account.email);
    if (existing) {
      if (existing.app_metadata.dojo_demo !== "v0.1") throw new Error(`A conta ${account.email} já existe sem identificação demo. O seed não a modificará.`);
      ids[account.role] = existing.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({ email: account.email, password, email_confirm: true, app_metadata: { dojo_demo: "v0.1" } });
      if (error || !data.user) throw error ?? new Error("Falha ao criar a conta demo.");
      ids[account.role] = data.user.id;
    }
  }
  const ownerId = ids.OWNER!;
  const coachId = ids.COACH!;
  const studentId = ids.STUDENT!;
  const { data: priorAcademy, error: priorError } = await admin.from("academies").select("*").eq("id", DEMO_ACADEMY_ID).maybeSingle();
  if (priorError) throw priorError;
  if (priorAcademy && priorAcademy.created_by !== ownerId) throw new Error("O ID da academia demo já está em uso. Nenhum dado existente será alterado.");
  const createdAt = priorAcademy?.created_at ?? new Date().toISOString();
  // Persist the original anchor: reruns never shift dates or overwrite real check-ins.
  const anchor = dateInZone(new Date(createdAt), DEMO_TIMEZONE);
  const data = makeDemoData(anchor, coachId, studentId);
  const ensure = (result: { error: { message: string } | null }) => { if (result.error) throw new Error(result.error.message); };
  ensure(await admin.from("academies").upsert({ id: DEMO_ACADEMY_ID, name: "Black Lotus Jiu-Jitsu", timezone: DEMO_TIMEZONE, created_by: ownerId, created_at: createdAt }, { onConflict: "id", ignoreDuplicates: true }));
  ensure(await admin.from("memberships").upsert(DEMO_ACCOUNTS.map((account) => ({ academy_id: DEMO_ACADEMY_ID, user_id: ids[account.role]!, role: account.role })), { onConflict: "academy_id,user_id", ignoreDuplicates: true }));
  ensure(await admin.from("students").upsert(data.students, { onConflict: "id", ignoreDuplicates: true }));
  ensure(await admin.from("check_ins").upsert(data.checkIns, { onConflict: "id", ignoreDuplicates: true }));
  ensure(await admin.from("student_achievements").upsert(data.unlocks, { onConflict: "academy_id,student_id,achievement_code", ignoreDuplicates: true }));
  ensure(await admin.from("gamification_events").upsert(data.events, { onConflict: "id", ignoreDuplicates: true }));
  console.log("Black Lotus Jiu-Jitsu pronta: 10 alunos fictícios, presenças, XP e conquistas.");
  console.log(`Datas ancoradas em ${anchor}. Ao repetir, dados e senhas existentes são preservados.`);
  console.log("Professor: professor@demo.dojo.test\nResponsável: owner@demo.dojo.test\nAluna (Marina): aluno@demo.dojo.test");
  console.log("Senha: o valor escolhido em DEMO_PASSWORD na primeira execução. A senha não é exibida pelo script.");
}
main().catch((error: unknown) => {
  console.error("Seed interrompido:", error instanceof Error ? error.message : "erro desconhecido");
  process.exitCode = 1;
});
