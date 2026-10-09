import { requireUser } from "@/lib/auth/session";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) { await requireUser(); return children; }
