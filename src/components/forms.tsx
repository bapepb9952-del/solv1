"use client";
import { useActionState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { loginAction, signupAction } from "@/lib/auth/actions";
import { createAcademyAction } from "@/features/academies/actions";
import { registerStudentAction } from "@/features/students/actions";
import { BELTS, BELT_LABELS } from "@/features/students/schema";
import { Spinner } from "./ui";
import type { ActionState } from "@/lib/actions";

function Feedback({ state }: { state: ActionState }) {
  return <>{state.error && <p className="feedback feedback-error" role="alert">{state.error}</p>}{state.success && <p className="feedback feedback-success" role="status">{state.success}</p>}</>;
}
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? loginAction : signupAction, {});
  return <form action={action} className="form-stack">
    <label>E-mail<input name="email" type="email" autoComplete="email" placeholder="voce@academia.com" required maxLength={254} /></label>
    <label>Senha<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "signup" ? 12 : 1} maxLength={128} placeholder={mode === "signup" ? "Pelo menos 12 caracteres" : "Sua senha"} required /></label>
    <Feedback state={state} />
    <button className="button button-primary button-full" disabled={pending}>{pending ? <Spinner /> : null}{mode === "login" ? "Entrar no dojo" : "Criar minha conta"}<ArrowRight size={17} /></button>
  </form>;
}
export function AcademyForm() {
  const [state, action, pending] = useActionState(createAcademyAction, {});
  return <form action={action} className="form-stack">
    <label>Nome da academia<input name="name" required minLength={2} maxLength={100} placeholder="Ex.: Black Lotus Jiu-Jitsu" /></label>
    <label>Fuso horário<select name="timezone" defaultValue="America/Sao_Paulo">
      <option value="America/Sao_Paulo">Brasília · São Paulo</option><option value="America/Manaus">Manaus</option><option value="America/Rio_Branco">Rio Branco</option><option value="America/Noronha">Fernando de Noronha</option><option value="Europe/Lisbon">Lisboa</option><option value="UTC">UTC</option>
    </select><small>Usado para o dia do check-in e os indicadores de frequência.</small></label>
    <Feedback state={state} />
    <button className="button button-primary" disabled={pending}>{pending ? <Spinner /> : <Plus size={17} />}Criar academia</button>
  </form>;
}
export function StudentForm({ academyId }: { academyId: string }) {
  const [state, action, pending] = useActionState(registerStudentAction.bind(null, academyId), {});
  return <form action={action} className="form-stack">
    <label>Nome completo<input name="fullName" required minLength={2} maxLength={100} autoComplete="name" placeholder="Nome do aluno" /></label>
    <label>Faixa atual<select name="belt" defaultValue="WHITE">{BELTS.map((belt) => <option key={belt} value={belt}>{BELT_LABELS[belt]}</option>)}</select><small>A graduação é definida pelo professor e não depende do XP.</small></label>
    <label>E-mail para acesso <span className="optional">opcional</span><input name="email" type="email" autoComplete="email" placeholder="aluno@exemplo.com" maxLength={254} /><small>Use o e-mail de uma conta já confirmada no Dojo OS. Deixe vazio para um cadastro sem login.</small></label>
    <Feedback state={state} />
    <button className="button button-primary" disabled={pending}>{pending ? <Spinner /> : <Plus size={17} />}Cadastrar aluno</button>
  </form>;
}
