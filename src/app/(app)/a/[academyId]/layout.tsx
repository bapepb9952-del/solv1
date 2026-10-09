import Link from "next/link";
import { ArrowLeftRight, LogOut, Leaf, ChevronDown } from "lucide-react";
import { academyContext } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { Brand } from "@/components/ui";
import { Navigation } from "@/components/navigation";
export default async function AcademyLayout({ children, params }: { children: React.ReactNode; params: Promise<{ academyId: string }> }) {
  const { academyId } = await params;
  const { academy, user, isStaff, role } = await academyContext(academyId);
  return <div className="app-shell"><a className="skip-link" href="#main-content">Pular para conteúdo</a><aside className="sidebar"><Link href="/academies" aria-label="Dojo OS, suas academias"><Brand light /></Link><Link href="/academies" className="academy-switch"><span className="academy-logo"><Leaf size={21} /></span><span><small>SEU DOJO</small><strong>{academy.name}</strong></span><ChevronDown size={14} /></Link><span className="nav-section-label">ACOMPANHAMENTO</span><Navigation academyId={academyId} isStaff={isStaff} /><div className="sidebar-bottom"><div className="sidebar-note"><span className="live-dot" /><strong>Um treino de cada vez.</strong><p>Grandes jornadas são feitas de pequenas presenças.</p></div><Link href="/academies" className="sidebar-link"><ArrowLeftRight size={16} />Trocar academia</Link><form action={logoutAction}><button className="sidebar-link"><LogOut size={16} />Sair da conta</button></form></div></aside><div className="app-main"><header className="topbar"><span>{academy.name}<span className="topbar-divider">/</span><strong>{isStaff ? "Área do professor" : "Área do aluno"}</strong></span><span className="user-pill"><span className="user-dot" />{role === "OWNER" ? "Responsável" : isStaff ? "Professor" : "Aluno"}<span className="user-email">{user.email}</span></span></header><main id="main-content" className="page-content">{children}</main><footer className="app-footer"><span>Dojo OS</span><span>Presença que vira progresso.</span></footer></div></div>;
}
