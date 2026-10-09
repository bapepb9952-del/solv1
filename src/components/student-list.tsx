"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import { Avatar, BeltBadge, EmptyState, RetentionBadge } from "./ui";
import { CheckInButton } from "./check-in-button";
import type { StudentWithRetention } from "@/features/students/queries";
import { trainingRecency } from "@/lib/dates";

export function StudentList({ students, academyId, initialStatus = "ALL" }: { students: StudentWithRetention[]; academyId: string; initialStatus?: string }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = students.filter((s) => normalize(s.full_name).includes(normalize(search)) && (status === "ALL" || s.retention.status === status));
  return <section className="panel students-panel" aria-label="Alunos da academia">
    <div className="panel-heading"><div><h2>Alunos <span className="count-badge">{students.length}</span></h2><p>Cada presença conta. Acompanhe quem está no tatame.</p></div>
      <div className="list-controls"><label className="search-field"><Search size={16} aria-hidden="true" /><span className="sr-only">Buscar aluno</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar aluno" /></label>
        <label><span className="sr-only">Filtrar por retenção</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">Todos os status</option><option value="ACTIVE">Ativos</option><option value="ATTENTION">Em atenção</option><option value="RISK">Em risco</option></select></label>
      </div>
    </div>
    {!filtered.length ? <EmptyState title={students.length ? "Nenhum aluno encontrado" : "Seu próximo treino começa aqui"}><p>{students.length ? "Tente outro nome ou ajuste o filtro." : "Cadastre o primeiro aluno para começar a acompanhar a frequência."}</p>{!students.length && <Link className="button button-primary" href={`/a/${academyId}/students/new`}>Cadastrar primeiro aluno</Link>}</EmptyState> : <>
      <div className="student-table-head"><span>Aluno / faixa</span><span>XP</span><span>Último treino</span><span>30 dias</span><span>Retenção</span><span>Presença</span></div>
      <ul className="student-rows">{filtered.map((s) => <li className="student-row" key={s.id}>
        <Link href={`/a/${academyId}/students/${s.id}`} className="student-identity"><Avatar name={s.full_name} /><span><strong>{s.full_name}<ArrowUpRight size={12} aria-hidden="true" /></strong><BeltBadge belt={s.belt} /></span></Link>
        <span className="student-value xp-value"><span className="mobile-label">XP</span>{s.total_xp.toLocaleString("pt-BR")} <small>XP</small></span>
        <span className="student-value"><span className="mobile-label">Último treino</span>{trainingRecency(s.last_training_on, s.today)}</span>
        <span className="student-value"><span className="mobile-label">Últimos 30 dias</span><strong>{s.sessions_30d}</strong><small> treinos</small></span>
        <span className="student-retention"><RetentionBadge status={s.retention.status} /></span>
        <CheckInButton academyId={academyId} studentId={s.id} checkedToday={s.sessions_today > 0} compact />
      </li>)}</ul><div className="list-footer">{filtered.length} de {students.length} alunos<span>XP reconhece presença. A faixa reconhece evolução técnica.</span></div>
    </>}
  </section>;
}
