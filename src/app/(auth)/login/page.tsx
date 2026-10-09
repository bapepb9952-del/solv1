import Link from "next/link";
import { AuthForm } from "@/components/forms";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <><p className="eyebrow">BEM-VINDO AO DOJO</p><h2>Bom ter você aqui.</h2><p className="auth-description">Entre para acompanhar o próximo capítulo da sua academia.</p>{error && <p role="alert" className="feedback feedback-error">O link de confirmação expirou ou é inválido. Solicite um novo cadastro ou tente entrar.</p>}<AuthForm mode="login" /><p className="auth-switch">Primeira vez aqui? <Link href="/signup">Criar uma conta</Link></p></>;
}
