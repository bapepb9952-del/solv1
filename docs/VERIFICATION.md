# Verificação da entrega

Validação realizada em 09/10/2026, em Linux, Node.js 24.19.0 e npm 11.9.0.

| Verificação | Resultado |
|---|---|
| Instalação das dependências | Concluída; `package-lock.json` incluído |
| `npm run lint` | Aprovado, sem erros ou warnings de lint |
| `npm run typecheck` | Aprovado com TypeScript estrito |
| `npm test` | 31 testes aprovados em 3 arquivos |
| `npm run build` | Next.js 16.4.0 compilado com sucesso |
| Migrations SQL | Ambas executadas sem alterações em PostgreSQL via PGlite |
| Seed SQL/fixtures | Carga completa executada duas vezes nos testes, sem duplicação |
| Supabase CLI | Versão instalada e comandos de migration verificados |

## Cenários automatizados relevantes

- OWNER criado junto com a academia.
- COACH acessa apenas academias em que tem vínculo.
- STUDENT vê apenas seu perfil e registra apenas a própria presença.
- Leituras de tabelas e da view respeitam isolamento.
- Acesso anônimo, escalada de papel e escritas diretas são negados.
- Referências entre academias são rejeitadas por FK composta.
- +10 XP, registro no ledger e conquista de primeiro treino.
- Repetir check-in não duplica presença, XP ou desbloqueio.
- Conquistas de 10 e 30 treinos, sem XP extra.
- Erro no desbloqueio reverte presença e XP da transação inteira.
- Histórico append-only, inclusive para operações privilegiadas comuns.
- Contagem correta dos períodos de 7/30 dias, sem multiplicação do ledger por joins.
- Limites de retenção nos dias 0/7/8/14/15 e fallback de cadastro.
- Data da academia próxima à meia-noite UTC e calendário com ano bissexto.
- Seed com 10 alunos, cinco faixas, três estados de retenção e eventos consistentes.
- Seed reaplicado com FKs válidas e XP derivado correto.

## Verificações que dependem do seu ambiente

Não havia Docker, projeto Supabase configurado nem credenciais disponíveis nesta sessão. A inspeção visual em navegador também não foi executada. Portanto não se afirma validação ponta a ponta de Supabase Auth, e-mail de confirmação, PostgREST ou interação no navegador.

PGlite executa PostgreSQL e RLS reais, com um contrato mínimo de Auth para os testes. Não reproduz a infraestrutura inteira do Supabase nem concorrência com múltiplas conexões.

Depois de preencher `.env.local`, aplicar migrations e executar o seed, siga o roteiro de 11 passos no README para validar a experiência no seu projeto antes de entregar à academia piloto.
