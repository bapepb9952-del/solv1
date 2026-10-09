import type { ReactNode } from "react";
import { LoaderCircle, Sprout, type LucideIcon } from "lucide-react";
import { BELT_LABELS } from "@/features/students/schema";
import { RETENTION_LABELS, type RetentionStatus } from "@/features/retention/service";
import type { Belt } from "@/lib/supabase/types";

export function Brand({ light = false }: { light?: boolean }) {
  return <div className={`brand ${light ? "brand-light" : ""}`}><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>dojo<span className="brand-os">OS</span></span></div>;
}
export function BeltBadge({ belt }: { belt: Belt }) {
  return <span className="belt"><span className={`belt-line belt-${belt.toLowerCase()}`} />{BELT_LABELS[belt]}</span>;
}
export function RetentionBadge({ status }: { status: RetentionStatus }) {
  return <span className={`status status-${status.toLowerCase()}`}><span />{RETENTION_LABELS[status]}</span>;
}
export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("");
  return <span className={`avatar ${large ? "avatar-large" : ""}`} aria-hidden="true">{initials}</span>;
}
export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: { label: string; value: ReactNode; hint: string; icon: LucideIcon; tone?: string }) {
  return <div className={`stat-card stat-${tone}`}><div className="stat-top"><span>{label}</span><Icon size={18} aria-hidden="true" /></div><strong className="stat-value">{value}</strong><span className="stat-hint">{hint}</span></div>;
}
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Sprout size={26} aria-hidden="true" /></span><h3>{title}</h3><div>{children}</div></div>;
}
export function Spinner() { return <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />; }
export function PageHeading({ eyebrow, title, children, action }: { eyebrow: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children && <p className="page-description">{children}</p>}</div>{action}</div>;
}
