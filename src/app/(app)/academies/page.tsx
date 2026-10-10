import Link from "next/link";
import { ArrowUpRight, Building2, Plus, LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { Brand, EmptyState, PageHeading } from "@/components/ui";
import { logoutAction } from "@/lib/auth/actions";
import { redirect } from "next/navigation";
export default async function Academies() {
  const { client, user } = await requireUser();
  const [academies, memberships] = await Promise.all([
    client.from("academies").select("*").order("name"),
    client.from("memberships").select("*").eq("user_id", user.id),
  ]);
  if (academies.error || memberships.error) throw new Error("Não foi possível carregar suas academias.");
  const studentOnly = memberships.data.length > 0 && memberships.data.every((membership) => membership.role === "STUDENT");
  if (studentOnly && memberships.data.length === 1) redirect(`/a/${memberships.data[0]!.academy_id}/me`);
  return <div className="selection-page"><header className="selection-header"><Brand /><form action={logoutAction}><button className="button button-ghost"><LogOut size={16} />Sair</button></form></header><main>
    <PageHeading eyebrow="SEU ESPAÇO NO TATAME" title={studentOnly ? "Minha jornada" : "Suas academias"} action={!studentOnly && memberships.data.length > 0 ? <Link className="button button-primary" href="/academies/new"><Plus size={17} />Criar academia</Link> : undefined}>Selecione uma academia para continuar.</PageHeading>
    {!academies.data.length ? <div className="panel"><EmptyState title="Encontre seu espaço no tatame"><p>Se é aluno, peça ao professor para vincular o e-mail <strong>{user.email}</strong> ao seu cadastro existente. Seus treinos e conquistas continuarão na mesma jornada.</p><p>É professor? <Link href="/academies/new">Criar minha academia</Link></p></EmptyState></div> : <div className="academy-grid">{academies.data.map((academy) => {
      const role = memberships.data.find((m) => m.academy_id === academy.id)?.role;
      return <Link className="academy-card" href={`/a/${academy.id}/${role === "STUDENT" ? "me" : "dashboard"}`} key={academy.id}><span className="academy-symbol"><Building2 size={25} /></span><span className="role-label">{role === "OWNER" ? "Responsável" : role === "COACH" ? "Professor" : "Aluno"}</span><h2>{academy.name}</h2><p>Abrir academia<ArrowUpRight size={19} /></p></Link>;
    })}</div>}
  </main></div>;
}
