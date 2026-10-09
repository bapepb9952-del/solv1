"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="error-page"><p className="eyebrow">VAMOS TENTAR DE NOVO</p><h1>Não foi possível carregar.</h1><p>Confira sua conexão. Se o problema continuar, verifique a configuração do Supabase e as migrations.</p><div className="button-row"><button className="button button-primary" onClick={reset}>Tentar novamente</button><Link className="button button-ghost" href="/academies">Voltar às academias</Link></div></main>;
}
