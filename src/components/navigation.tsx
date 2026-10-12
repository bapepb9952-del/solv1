"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, UserRound, QrCode } from "lucide-react";

export function Navigation({ academyId, isStaff }: { academyId: string; isStaff: boolean }) {
  const path = usePathname();
  const items = isStaff ? [
    { href: `/a/${academyId}/dashboard`, label: "Visão geral", icon: LayoutDashboard },
    { href: `/a/${academyId}/students`, label: "Alunos", icon: Users },
    { href: `/a/${academyId}/check-in/qr`, label: "Check-in por QR", icon: QrCode },
  ] : [{ href: `/a/${academyId}/me`, label: "Meu progresso", icon: UserRound }];
  return <nav className="main-nav" aria-label="Menu principal">{items.map(({ href, label, icon: Icon }) => {
    const active = path === href || (label === "Alunos" && path.startsWith(`${href}/`)) || !isStaff;
    return <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><Icon size={18} />{label}{active && <span className="nav-dot" />}</Link>;
  })}</nav>;
}
