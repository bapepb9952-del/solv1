import Link from "next/link";
import { ArrowLeft, Activity, CalendarDays, Flame, Trophy, Check, LockKeyhole, CalendarCheck2 } from "lucide-react";
import { academyContext } from "@/lib/auth/session";
import { getStudent } from "@/features/students/queries";
import { studentHistory } from "@/features/gamification/queries";
import { retentionStatus } from "@/features/retention/service";
import { ACHIEVEMENT_NAMES } from "@/features/gamification/schema";
import { Avatar, BeltBadge, EmptyState, RetentionBadge, StatCard } from "@/components/ui";
import { CheckInButton } from "@/components/check-in-button";
import { StudentAccessForm } from "@/components/forms";
import { formatDate, formatDateTime, trainingRecency } from "@/lib/dates";
export default async function StudentProfile({ params, searchParams }: { params: Promise<{ academyId: string; studentId: string }>; searchParams: Promise<{ page?: string }> }) {
  const { academyId, studentId } = await params;
  const query = await searchParams;
  const rawPage = Number(query.page ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000 ? rawPage : 1;
  const { isStaff } = await academyContext(academyId);
  const student = await getStudent(academyId, studentId);
  const history = await studentHistory(academyId, studentId, page);
  const retention = retentionStatus({ lastTrainingOn: student.last_training_on, joinedOn: student.joined_on, today: student.today });
  return <>{isStaff && <Link href={`/a/${academyId}/students`} className="back-link"><ArrowLeft size={16} />Todos os alunos</Link>}
    <section className="profile-heading"><div className="profile-identity"><Avatar name={student.full_name} large /><div><p className="eyebrow">{isStaff ? "JORNADA DO ALUNO" : "MEU PROGRESSO"}</p><h1>{student.full_name}</h1><div className="profile-badges"><BeltBadge belt={student.belt} /><span className="muted">·</span><RetentionBadge status={retention.status} /></div></div></div><CheckInButton academyId={academyId} studentId={studentId} checkedToday={student.sessions_today > 0} /></section>
    <div className="profile-stats"><StatCard label="XP conquistado" value={student.total_xp.toLocaleString("pt-BR")} hint="10 XP por treino registrado" icon={Flame} tone="featured" /><StatCard label="Total de treinos" value={student.total_check_ins} hint="Toda a sua jornada" icon={Activity} /><StatCard label="Últimos 7 dias" value={student.sessions_7d} hint="Sua constância recente" icon={CalendarCheck2} /><StatCard label="Últimos 30 dias" value={student.sessions_30d} hint="Treinos, incluindo hoje" icon={CalendarDays} /></div>
    <div className="last-training-bar"><CalendarCheck2 size={18} /><span>Último treino: <strong>{trainingRecency(student.last_training_on, student.today)}</strong>{student.last_training_on && <span className="muted"> · {formatDate(student.last_training_on)}</span>}</span><span className="muted">No dojo desde {formatDate(student.joined_on)}</span></div>
    {isStaff && <section className="panel form-panel student-access-panel">{student.user_id ? <p role="status">Acesso do aluno vinculado. Ele pode entrar com sua conta para acompanhar esta jornada.</p> : <details><summary>Vincular acesso</summary><StudentAccessForm academyId={academyId} studentId={studentId} /></details>}</section>}
    {!isStaff && <p className="policy-note">Cada presença soma 10 XP à sua jornada. Confira seu próximo marco abaixo e volte ao tatame no seu ritmo.</p>}
    <div className="profile-columns"><section className="panel history-panel"><div className="panel-heading"><div><h2>Histórico de progresso</h2><p>Cada treino, uma nova linha na sua história.</p></div><span className="count-badge">{history.count}</span></div>
      {!history.events.length ? <EmptyState title={page > 1 ? "Não há eventos nesta página" : "O primeiro capítulo está por vir"}><p>Os treinos e as conquistas aparecem aqui.</p>{page > 1 && <Link href={`/a/${academyId}/students/${studentId}`}>Voltar ao histórico recente</Link>}</EmptyState> : <ul className="timeline">{history.events.map((event) => <li key={event.id}><span className={`timeline-icon ${event.event_type === "CHECK_IN" ? "" : "achievement-icon"}`}>{event.event_type === "CHECK_IN" ? <Check size={17} /> : <Trophy size={17} />}</span><div><strong>{event.event_type === "CHECK_IN" ? "Presença no tatame" : `Conquista: ${ACHIEVEMENT_NAMES[event.achievement_code ?? ""] ?? "Marco alcançado"}`}</strong><time dateTime={event.created_at}>{formatDateTime(event.created_at, student.timezone)}</time></div><span className="timeline-xp">{event.xp_delta > 0 ? `+${event.xp_delta} XP` : "Conquista"}</span></li>)}</ul>}
      {(page > 1 || history.count > page * 20) && <nav className="pagination" aria-label="Paginação do histórico">{page > 1 ? <Link href={`?page=${page - 1}`}>Mais recentes</Link> : <span />}<span>Página {page}</span>{history.count > page * 20 ? <Link href={`?page=${page + 1}`}>Mais antigos</Link> : <span />}</nav>}
    </section><section className="panel achievements-panel"><div className="panel-heading"><div><h2>Suas conquistas</h2><p>Pequenos marcos. Grandes motivos.</p></div><Trophy size={19} /></div><div className="achievement-list">{history.catalog.map((achievement) => {
      const unlock = history.unlocks.find((u) => u.achievement_code === achievement.code);
      return <div key={achievement.code} className={`achievement ${unlock ? "unlocked" : "locked"}`}><span className="achievement-medal">{unlock ? <Trophy size={21} /> : <LockKeyhole size={20} />}</span><div><strong>{achievement.name}</strong><p>{achievement.description}</p>{unlock ? <small>Conquistado em {formatDateTime(unlock.unlocked_at, student.timezone)}</small> : <><div className="progress-track" role="progressbar" aria-label={achievement.name} aria-valuenow={Math.min(student.total_check_ins, achievement.required_sessions)} aria-valuemin={0} aria-valuemax={achievement.required_sessions}><span style={{ width: `${Math.min(100, student.total_check_ins / achievement.required_sessions * 100)}%` }} /></div><small>{student.total_check_ins} / {achievement.required_sessions} treinos</small></>}</div></div>;
    })}</div><p className="achievement-note">Seu XP celebra a presença. A graduação continua sendo uma decisão do professor.</p></section></div>
    {retention.basis === "REGISTRATION" && <p className="policy-note">Como ainda não há treino registrado, o status considera os dias desde o cadastro.</p>}
  </>;
}
