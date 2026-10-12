# Check-in: comparação e contrato da próxima evolução

Revisão estática em 12/10/2026. Snapshots, licenças e links dos arquivos estão no [mapa de referências](OPEN_SOURCE_REFERENCE.md). **Este documento não implementa QR.**

## Decisão

Manter `public.record_check_in` e `gamification_events` como núcleo. Reaproveitar uma UI MIT ou biblioteca de QR quando houver uma integração concreta. Implementar a validação e o consumo de token dentro do banco do Dojo OS, com a mesma sessão, tenant e transação de presença/XP/conquistas.

O código atual já protege uma parte importante que os exemplos externos não fornecem no mesmo formato. Substituí-lo por várias gravações independentes introduziria risco sem benefício para o piloto.

## Comparação

| Critério | Dojo OS atual | Martial Arts Manager | Fitness Platform | TatamiHQ / DojoUK |
|---|---|---|---|---|
| Identidade e tenant | Auth + memberships por academia | Usuário/role global + branch; admin global | Auth, staff/members/gyms, chamadas administrativas | Modelos diferentes; não demonstram compatibilidade direta |
| Banco | PostgreSQL/Supabase, RLS e FKs compostas | SQLite/Cloudflare D1 | Supabase/PostgreSQL | Tatami usa Supabase; DojoUK usa Django/MySQL |
| UX de QR | Ainda não implementada | Academia/aula exibe QR, aluno escaneia | Aluno exibe token, funcionário escaneia | Nenhum fluxo QR foi validado nesta revisão |
| Validade | Check-in usa relógio do PostgreSQL e dia local | Validade opcional; endpoint consultado usa timestamp do payload | Token com 2 minutos; função verifica relógio do servidor | Não avaliadas para QR |
| Repetição | Constraint por academia/aluno/dia + lock | Endpoint consulta presença por aula antes de inserir | Lê `used`, depois faz update/insert em chamadas distintas | Não avaliadas para QR |
| XP/conquistas | Mesma transação do check-in | Não é o ledger do Dojo OS | Processamento separado após presença | Não oferecem o nosso contrato de XP |
| Reutilização selecionada | Manter núcleo | Candidato de UI MIT; adaptar fluxo | Requisito conceitual, código sem licença confirmada | UI/domínio ou referência funcional, conforme licença |

A análise não executou os doadores nem demonstrou uma vulnerabilidade operacional. As limitações acima são diferenças e riscos observáveis nos arquivos consultados.

## Contrato proposto para QR

Default de UX proposto: **aluno autenticado exibe QR temporário; professor/OWNER/COACH da mesma academia escaneia e confirma**. É um fluxo simples, aproveita o vínculo de aluno existente e dispensa modelar turmas para começar. O fluxo invertido de QR da academia exigiria outro contrato e não deve ser misturado silenciosamente.

### Identidade e armazenamento

- Token opaco e aleatório com entropia suficiente; não usar apenas o ID público do aluno ou um prefixo curto de UUID.
- Guardar hash do segredo no banco, vinculado a `academy_id`, `student_id`, emissor, emissão, expiração e consumo; o QR não carrega e-mail, nome ou credencial de sessão.
- Validade inicial proposta: 120 segundos, definida e verificada pelo servidor.
- Emissão exige sessão e vínculo com aquele Student/academia; a leitura pelo professor exige papel e membership atuais na academia do token.
- Aplicar FKs compostas, RLS e grants mínimos. Não permitir insert/update direto de tokens ou presenças pelo cliente.
- Renovação revoga token anterior ainda não consumido do mesmo aluno/academia; limitar emissões/validações para evitar abuso. Não registrar tokens crus em logs.

### Consumo e concorrência

- Expor RPCs delimitadas para emitir e resgatar tokens, usando sessão autenticada, sem `service_role` no caminho do produto.
- Validar tenant, usuário, papel, vínculo, expiração e estado do token no PostgreSQL.
- Adotar ordem consistente de locks por aluno/token para evitar deadlocks entre emissão e consumo.
- Consumir o token e chamar o fluxo de presença/XP/conquistas na **mesma transação**. Se o registro falhar, o consumo também deve ser revertido.
- Clique duplicado/replay do mesmo token não concede XP adicional. Dois tokens ou o check-in manual no mesmo dia continuam sujeitos à unicidade diária existente.
- Quando já houver presença no dia, informar “treino já registrado” e consumir o token válido conforme contrato de uso único, sem criar outro evento CHECK_IN.
- Não aceitar `xp_delta`, papel, autor, validade ou timestamp arbitrário do navegador.

### UX e alcance da validação

- Aluno: QR, contagem regressiva, renovar, expirado, offline e confirmação de treino; não mostrar sucesso antes de o banco confirmar.
- Professor: selecionar academia, solicitar câmera no momento do uso, tratar câmera recusada/QR inválido/expirado/aluno de outra academia e mostrar nome antes da confirmação.
- Preservar o registro manual pelo professor para alunos sem celular e falhas de câmera.
- A aplicação atual permite auto-check-in direto pelo aluno. **Acrescentar QR sem mudar essa permissão não prova presença física.** No primeiro rollout opcional, comunicar isso claramente. Se o produto passar a exigir validação presencial, restringir o caminho direto do aluno também no banco e testar tentativas de contornar a UI.
- Fazer a mudança de câmera de forma explícita: `next.config.ts` atualmente usa `Permissions-Policy: camera=()`. O scanner precisará de uma política compatível com a rota/origem, sem liberar câmera de forma desnecessária em todo o produto.
- Não acoplar cobrança, geolocalização, biometria, turmas ou graduação à primeira versão de QR.

## Critérios de aceite para a implementação futura

| Cenário | Resultado exigido |
|---|---|
| Aluno A emite token; professor A confirma | 1 presença, +10 XP, conquistas coerentes e histórico atualizado |
| Professor B ou aluno diferente tenta consumir | Acesso negado; nenhum consumo/presença/XP |
| Token expirado, revogado, inválido ou adulterado | Rejeição no servidor; sem mutação |
| Duas confirmações concorrentes do mesmo token | Apenas um consumo e uma presença; zero XP duplicado |
| Dois tokens diferentes / disputa com check-in manual | No máximo um treino diário e +10 XP |
| Erro induzido na conquista/ledger | Reverte presença e consumo do token |
| Relógio do celular alterado / mudança de dia UTC | Validade e dia local seguem relógio/fuso do servidor |
| Conta desvinculada ou permissão removida após emissão | Reavaliar autorização atual; negar quando não houver permissão |
| Câmera recusada ou rede indisponível | Estado claro e alternativa operacional do professor |
| Graduação e vínculo de aluno | Permanecem independentes; sem perda de histórico |

Cobrir regras SQL com PGlite e executar as disputas em PostgreSQL/Supabase real com conexões distintas. Validar scanner em navegador móvel real e HTTPS. Não marcar esses critérios como atendidos apenas por criar tabelas/componentes.

## Impacto desta revisão

Nenhum código de QR foi copiado, nenhuma dependência adicionada e nenhuma migration criada nesta etapa. A entrega é o contrato auditado para a próxima implementação, com preservação do check-in e do vínculo de aluno existentes.
