import { Brand } from "@/components/ui";
import Link from "next/link";
export default function Setup() {
  return <main className="setup-page"><Brand /><section className="panel form-panel"><p className="eyebrow">PREPARAÇÃO DO PROJETO</p><h1>Conecte seu Supabase.</h1><p>O Dojo OS está instalado. Siga o README para configurar o banco e a autenticação.</p><ol className="setup-steps"><li>Copie <code>.env.example</code> para <code>.env.local</code> e preencha a URL e a chave pública.</li><li>Aplique as migrations e rode <code>npm run seed</code> para carregar a Black Lotus.</li><li>Reinicie <code>npm run dev</code> e entre com a conta de demonstração.</li></ol><Link href="/login" className="button button-primary">Ir para o acesso</Link></section></main>;
}
