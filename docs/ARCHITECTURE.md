# Decisões e riscos — Dojo OS 0.1

## Decisões

1. **Tenant na URL e no banco.** O contexto `/a/[academyId]` torna a academia explícita. A URL é entrada não confiável; membership, papel e RLS são verificados independentemente.
2. **Identidade não é aluno.** Supabase Auth fornece identidade global. Membership fornece papel por academia. Student fornece o cadastro esportivo, opcionalmente vinculado a uma identidade. Isso permite matricular quem não tem login.
3. **Monólito modular.** Um projeto Next.js e um banco Supabase permitem colocar o piloto em uso sem serviços extras. `features` separa regras e consultas por responsabilidade.
4. **Mutação crítica no PostgreSQL.** Check-in, XP e desbloqueios têm de confirmar ou falhar juntos. Uma sequência de chamadas do navegador não garante essa atomicidade.
5. **Ledger como fonte de XP.** O dashboard soma eventos. Não há campo mutável `students.xp`, nem promoção por XP. Um cache futuro deve ser reconstruível a partir do ledger.
6. **Concorrência por aluno.** `SELECT ... FOR UPDATE` serializa check-ins do mesmo aluno. A unicidade por dia é uma segunda garantia; a chave dos desbloqueios evita badges duplicados.
7. **Datas de calendário.** Cada presença guarda instante UTC e dia local calculado pelo servidor. Mudar de dia depende do fuso da academia, não do aparelho do aluno.
8. **Retenção explicável.** Uma função pura em TypeScript aplica limites inclusivos de 7 e 14 dias. Ausência sem treino usa cadastro e mostra a base ao usuário.
9. **Views com direitos do chamador.** `security_invoker` preserva RLS. Agregar check-ins e ledger separadamente evita a multiplicação de linhas e de XP.
10. **Preparação para PWA limitada.** Manifesto, ícone e layout móvel estão prontos; nenhuma sessão/dado sensível é armazenado em cache offline.

## Permissões

| Operação na academia | OWNER | COACH | STUDENT |
|---|---|---|---|
| Dashboard e lista completa | Sim | Sim | Não |
| Cadastrar aluno | Sim | Sim | Não |
| Ver perfil/histórico/conquistas | Todos da academia | Todos da academia | Somente próprio |
| Registrar check-in | Todos da academia | Todos da academia | Somente próprio |
| Alterar XP diretamente | Não | Não | Não |
| Alterar papel pela API | Não | Não | Não |
| Ver dados de outra academia sem vínculo | Não | Não | Não |

Qualquer conta autenticada pode criar uma nova academia e tornar-se OWNER dela. Isso não altera papéis em academias existentes. Nesta versão a interface não administra professores; o seed cria os três papéis para validação.

## Riscos conhecidos e tratamento

| Risco | Tratamento atual | Limite do piloto |
|---|---|---|
| Vazamento entre academias | RLS, grants mínimos, FKs compostas e testes de autorização | Novas tabelas/RPCs exigem os mesmos testes |
| Check-in repetido | Transação, lock por aluno e constraint única | Teste de carga com conexões distintas não executado nesta entrega |
| XP/histórico divergente | Ledger append-only e escrita conjunta pelo RPC | Seed usa privilégios administrativos, com validação própria |
| Horário incorreto no aparelho | Relógio e timezone do PostgreSQL | Não há edição de fuso na interface; mudanças futuras precisam preservar datas históricas |
| Falha parcial de seed | IDs estáveis, inserts idempotentes, âncora persistida | Não interagir com o demo antes do seed terminar |
| Retenção mal interpretada | Regra visível, fallback explícito e linguagem de acompanhamento | Férias, lesões e pausas não têm exceções nesta versão |
| Presença falsa por aluno | Uma presença por dia, autor registrado | Sem validação presencial/QR code no MVP solicitado |
| Crescimento do histórico | Índices, paginação de eventos e busca de métricas em lotes | Dashboard de grandes redes exigirá agregação adicional |
| Credencial administrativa exposta | Somente script local, `.env.local` ignorado | Operador deve manter segredo fora do ambiente público |
| Integração Auth/e-mail | SSR e confirmação implementados conforme Supabase | Fluxo real depende da configuração do projeto; seguir roteiro no README |

## Etapas implementadas

1. Schema, RLS, funções de mutação, view e testes SQL.
2. Auth SSR, confirmação, seleção/criação de academia e cadastro.
3. Dashboard, filtros, check-in com feedback, perfil, frequência e histórico.
4. Seed Black Lotus, marcos, documentação, lint, TypeScript, testes e build.

Não foram incluídos módulos de ERP nem mecanismos de gamificação além do escopo acordado.
