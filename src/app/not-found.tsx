import Link from "next/link";
export default function NotFound() { return <main className="error-page"><p className="eyebrow">PÁGINA INDISPONÍVEL</p><h1>Não encontramos esse espaço.</h1><p>Ele pode não existir ou não estar disponível para sua conta.</p><Link className="button button-primary" href="/academies">Ir para minhas academias</Link></main>; }
