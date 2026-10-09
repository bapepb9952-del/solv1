import Link from "next/link";
import { ArrowUpRight, Building2, Plus, LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { Brand, EmptyState, PageHeading } from "@/components/ui";
import { logoutAction } from "@/lib/auth/actions";
export default async function Academies() {
  const { client, user } = await requireUser();
  const [academies, memberships] = await Promise.all([
    client.from("academies").select("*").order("name"),
    client.from("memberships").select("*").eq("user_id", user.id),
  ]);
  if (academies.error || memberships.error) throw new Error("Não foi possível carregar suas academias.");
  return <div className="selection-page"><header className="selection-header"><Brand /><form action={logoutAction}><button className="button button-ghost"><LogOut size={16} />Sair</button></form></header><main>
    <PageHeading eyebrow="SEU ESPAÇO NO TATAME" title="Suas academias" action={<Link className="button button-primary" href="/academies/new"><Plus size={17} />Criar academia</Link>}>Selecione uma academia para continuar.</PageHeading>
    {!academies.data.length ? <div className="panel"><EmptyState title="Seu dojo começa aqui"><p>Se você é professor, crie sua academia. Se é aluno, peça ao professor para vincular o e-mail <strong>{user.email}</strong> ao seu cadastro.</p><Link href="/academies/new" className="button button-primary">Criar minha academia</Link></EmptyState></div> : <div className="academy-grid">{academies.data.map((academy) => {
      const role = memberships.data.find((m) => m.academy_id === academy.id)?.role;
      return <Link className="academy-card" href={`/a/${academy.id}/${role === "STUDENT" ? "me" : "dashboard"}`} key={academy.id}><span className="academy-symbol"><Building2 size={25} /></span><span className="role-label">{role === "OWNER" ? "Responsável" : role === "COACH" ? "Professor" : "Aluno"}</span><h2>{academy.name}</h2><p>Abrir academia<ArrowUpRight size={19} /></p></Link>;
    })}</div>}
  </main></div>;
}
