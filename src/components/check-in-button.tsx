"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { checkInAction } from "@/features/check-ins/actions";
import type { ActionState } from "@/lib/actions";
import { Spinner } from "./ui";

export function CheckInButton({ academyId, studentId, checkedToday, compact = false }: { academyId: string; studentId: string; checkedToday: boolean; compact?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<ActionState>({});
  const router = useRouter();
  return <div className={`check-in-control ${compact ? "compact" : ""}`}>
    <button className={`button ${checkedToday ? "button-done" : compact ? "button-soft" : "button-primary"}`} disabled={pending || checkedToday} onClick={() => startTransition(async () => {
      setState({});
      try { setState(await checkInAction(academyId, studentId)); router.refresh(); }
      catch { setState({ error: "Não foi possível confirmar. Atualize a página e tente novamente." }); }
    })}>{pending ? <Spinner /> : checkedToday ? <Check size={16} /> : <Plus size={16} />}{checkedToday ? "Treinou hoje" : compact ? "Check-in" : "Registrar treino · +10 XP"}</button>
    {state.error && <p role="alert" className="check-feedback error-text">{state.error}</p>}
    {state.success && <p role="status" className="check-feedback success-text">{state.success}</p>}
  </div>;
}
