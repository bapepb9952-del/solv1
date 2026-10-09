import Link from "next/link";
import { AuthForm } from "@/components/forms";
export default function Signup() {
  return <><p className="eyebrow">SEU PRIMEIRO PASSO</p><h2>Faça parte.</h2><p className="auth-description">Crie sua conta. Professores podem abrir uma academia; alunos recebem o vínculo pelo professor.</p><AuthForm mode="signup" /><p className="auth-switch">Já tem conta? <Link href="/login">Entrar no dojo</Link></p></>;
}
