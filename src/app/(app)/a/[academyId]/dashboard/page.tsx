import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, CalendarCheck2, Activity, CircleCheck, Clock3, HeartHandshake, Plus, ArrowUpRight } from "lucide-react";
import { academyContext } from "@/lib/auth/session";
import { listStudents } from "@/features/students/queries";
import { PageHeading, StatCard } from "@/components/ui";
import { StudentList } from "@/components/student-list";
export default async function Dashboard({ params }: { params: Promise<{ academyId: string }> }) {
  const { academyId } = await params;
  const { academy, isStaff } = await academyContext(academyId);
  if (!isStaff) redirect(`/a/${academyId}/me`);
  const students = await listStudents(academyId);
  const countStatus = (status: string) => students.filter((s) => s.retention.status === status).length;
  const today = students.reduce((sum, s) => sum + s.sessions_today, 0);
  const week = students.reduce((sum, s) => sum + s.sessions_7d, 0);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { timeZone: academy.timezone, weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const risk = countStatus("RISK");
  return <><PageHeading eyebrow={dateLabel} title="O ritmo do seu dojo." action={<Link href={`/a/${academyId}/students/new`} className="button button-primary"><Plus size={17} />Novo aluno</Link>}>Acompanhe a presença. Fortaleça a constância.</PageHeading>
    <div className="stats-grid"><StatCard label="Total de alunos" value={students.length} hint="Sua comunidade no tatame" icon={Users} /><StatCard label="Check-ins hoje" value={today} hint="Presenças registradas" icon={CalendarCheck2} tone="featured" /><StatCard label="Últimos 7 dias" value={week} hint="Treinos, incluindo hoje" icon={Activity} /><StatCard label="Alunos ativos" value={countStatus("ACTIVE")} hint="Até 7 dias de ausência" icon={CircleCheck} tone="active" /><StatCard label="Em atenção" value={countStatus("ATTENTION")} hint="8 a 14 dias de ausência" icon={Clock3} tone="attention" /><StatCard label="Em risco" value={risk} hint="15 dias ou mais de ausência" icon={HeartHandshake} tone="risk" /></div>
    <div className="retention-callout"><span className="callout-icon"><HeartHandshake size={22} /></span><div><strong>{risk ? `${risk} ${risk === 1 ? "aluno pode precisar" : "alunos podem precisar"} de uma conversa.` : "Presença é o começo de uma boa conversa."}</strong><p>{risk ? "Uma ausência é um sinal para se aproximar. Veja quem está há mais tempo sem treinar." : "Acompanhe a frequência para reconhecer a constância e acolher quem está voltando."}</p></div>{risk > 0 && <Link href={`/a/${academyId}/students?status=RISK`}>Ver alunos<ArrowUpRight size={16} /></Link>}</div>
    <StudentList academyId={academyId} students={students} />
    <p className="policy-note">Retenção usa dias desde o último treino. Para quem ainda não treinou, usa dias desde o cadastro. É um sinal de acompanhamento, não uma previsão de cancelamento.</p>
  </>;
}
