# Referências open source para o Dojo OS

Data da revisão: **12/10/2026**. Base do Dojo OS: [`6db58222c36f0652cda1277ed58033463c9192d8`](https://github.com/bapepb9952-del/solv1/commit/6db58222c36f0652cda1277ed58033463c9192d8), incluindo o vínculo posterior de acesso do aluno.

Objetivo: aproveitar implementações existentes quando economizarem trabalho e preservarem segurança, domínio e manutenção. O diferencial do Dojo OS continua sendo gamificação e retenção, com um piloto funcional antes de ampliar o escopo.

Esta revisão é uma inspeção estática dos arquivos citados. Os quatro projetos doadores não foram instalados, executados ou submetidos a uma auditoria completa. Não se afirma maturidade de produção apenas porque há código público.

## Situação dos candidatos

| Projeto e snapshot | Licença verificada | O que foi constatado | Decisão para o Dojo OS |
|---|---|---|---|
| [Martial Arts Manager](https://github.com/electrocicla/martial-arts-manager/tree/1c05e47bc643fe1e0ee13be09fd73c2ca713dce4) · `1c05e47` | [MIT](https://github.com/electrocicla/martial-arts-manager/blob/1c05e47bc643fe1e0ee13be09fd73c2ca713dce4/LICENSE) | React/Vite, Cloudflare Pages/D1, QR de aula/local, permissões e unidades | Candidato a adaptação pontual de UI/QR. Backend e autorização precisam ser adaptados ao PostgreSQL e ao tenant do Dojo OS |
| [TatamiHQ](https://github.com/Tatami-HQ/tatamihq/tree/9138ba15fa6152ab9cecc3ee815a39a5a88fae0f) · `9138ba1` | [MIT](https://github.com/Tatami-HQ/tatamihq/blob/9138ba15fa6152ab9cecc3ee815a39a5a88fae0f/LICENSE) | Next.js 15/Supabase; código de classes/sistema de faixas. README lista recursos como **Features (Planned)** | Candidato de UI e domínio. Não presumir presença, kiosk, pagamentos e multi-academia completos ou seguros por causa da lista do README |
| [DojoUK/Dojo](https://github.com/DojoUK/Dojo/tree/b2dd25f81eda1ced321ce72e12dc3a0153cce517) · `b2dd25f` | [AGPLv3](https://github.com/DojoUK/Dojo/blob/b2dd25f81eda1ced321ce72e12dc3a0153cce517/LICENSE) | Django/MySQL; código de analytics de frequência com estados por ausência | Referência funcional nesta estratégia. Não classificar como MIT nem portar seu código sem uma decisão específica de licença |
| [Fitness Platform](https://github.com/Hamim-Susmit/Fitness-Platform/tree/3fad91891bbd7e80b37cd95df682b3cc6900beaf) · `3fad918` | Não localizada explicitamente na árvore/README inspecionados | Supabase Edge Functions com token QR de 2 minutos e validação por funcionário | Referência conceitual. Incorporação de código pendente de esclarecimento de licença; validação atual também exige revisão transacional |

As revisões acima identificam os snapshots lidos. Antes de importar um trecho de outro commit, verificar novamente licença, implementação e dependências. Licença de código não implica direito de usar marca, logotipo ou dados do projeto.

## Arquivos úteis e limites encontrados

### Martial Arts Manager

- [`src/components/attendance/QRCodeCanvas.tsx`](https://github.com/electrocicla/martial-arts-manager/blob/1c05e47bc643fe1e0ee13be09fd73c2ca713dce4/src/components/attendance/QRCodeCanvas.tsx): componente pequeno de renderização com `qrcode`. Candidato para QR quando o fluxo existir. Acrescentar acessibilidade, feedback de erro e expiração ao adaptar; verificar a dependência separadamente.
- [`functions/api/attendance/qr.ts`](https://github.com/electrocicla/martial-arts-manager/blob/1c05e47bc643fe1e0ee13be09fd73c2ca713dce4/functions/api/attendance/qr.ts): criação/listagem/desativação de QR com período de validade. É uma referência de ciclo de vida, não um RPC Supabase pronto.
- [`functions/api/student/attendance/check-in.ts`](https://github.com/electrocicla/martial-arts-manager/blob/1c05e47bc643fe1e0ee13be09fd73c2ca713dce4/functions/api/student/attendance/check-in.ts): verificação de matrícula e repetição por aula. Usa `timestamp` do payload para checar validade/dia; essa escolha não atende ao contrato de segurança do Dojo OS.
- [`functions/utils/branches.ts`](https://github.com/electrocicla/martial-arts-manager/blob/1c05e47bc643fe1e0ee13be09fd73c2ca713dce4/functions/utils/branches.ts): contexto por unidade; administrador global pode acessar qualquer unidade. **Múltiplas unidades não equivalem ao nosso isolamento entre academias independentes.** Não importar esse bypass.
- [`migrations/add_multi_branch_system.sql`](https://github.com/electrocicla/martial-arts-manager/blob/1c05e47bc643fe1e0ee13be09fd73c2ca713dce4/migrations/add_multi_branch_system.sql): migração SQLite/D1 com unidade `main`. Não executar no banco do Dojo OS.
- [`src/lib/studentUtils.ts`](https://github.com/electrocicla/martial-arts-manager/blob/1c05e47bc643fe1e0ee13be09fd73c2ca713dce4/src/lib/studentUtils.ts): ilustra que utilitários de faixas precisam de revisão de domínio: a ordenação inspecionada não inclui Purple e usa graduações de outras modalidades. Manter nosso enum de cinco faixas nesta versão.

### TatamiHQ

- [`web/package.json`](https://github.com/Tatami-HQ/tatamihq/blob/9138ba15fa6152ab9cecc3ee815a39a5a88fae0f/web/package.json): confirma Next.js/TypeScript/Tailwind/Supabase. Proximidade de stack não demonstra compatibilidade de schema ou autorização.
- [`web/app/martial-arts/[id]/classes/[classId]/page.tsx`](https://github.com/Tatami-HQ/tatamihq/blob/9138ba15fa6152ab9cecc3ee815a39a5a88fae0f/web/app/martial-arts/%5Bid%5D/classes/%5BclassId%5D/page.tsx): UI e operações de `belt_system` ligadas a modalidades/classes. Candidato de interação quando graduação manual/turmas entrarem no escopo. Não foi constatada aqui uma garantia completa de multi-tenant por RLS.
- [`docs/DATABASE.md`](https://github.com/Tatami-HQ/tatamihq/blob/9138ba15fa6152ab9cecc3ee815a39a5a88fae0f/docs/DATABASE.md): descrição resumida de entidades, não um conjunto completo de migrations e políticas de isolamento.
- [`web/lib/authUtils.ts`](https://github.com/Tatami-HQ/tatamihq/blob/9138ba15fa6152ab9cecc3ee815a39a5a88fae0f/web/lib/authUtils.ts) e [`supabaseClient.ts`](https://github.com/Tatami-HQ/tatamihq/blob/9138ba15fa6152ab9cecc3ee815a39a5a88fae0f/web/lib/supabaseClient.ts): fluxo de sessão no navegador. Manter SSR, cookies, `getUser()` e autorização do Dojo OS; não substituir por checagem de `getSession()` no cliente.

### DojoUK

- [`classes/views.py`](https://github.com/DojoUK/Dojo/blob/b2dd25f81eda1ced321ce72e12dc3a0153cce517/classes/views.py): analytics por organização com última presença, contagens de 4/8 semanas e estados `active`, `at_risk`, `absent`, `never`. A classificação lida usa limites de 2/4 semanas.
- Isso sustenta a ideia de acompanhamento por frequência; não comprova um modelo de previsão de cancelamento nem a regra individual “3,2 vezes → 0,7 vezes”. Essa evolução precisa de especificação e validação próprias.
- A palavra “retention” em outros arquivos também trata **retenção de dados pessoais**. Não confundir com retenção comercial de alunos.
- Para esta estratégia, extrair requisitos observáveis de produto, sem copiar, traduzir ou portar código AGPL. Eventual incorporação precisa considerar obrigações de distribuição/uso em rede da licença, em vez de apenas atribuição MIT.

### Fitness Platform

- [`generate_qr_token/index.ts`](https://github.com/Hamim-Susmit/Fitness-Platform/blob/3fad91891bbd7e80b37cd95df682b3cc6900beaf/supabase/functions/generate_qr_token/index.ts): autentica o aluno, verifica status e cria token com validade de 2 minutos.
- [`validate_qr_token/index.ts`](https://github.com/Hamim-Susmit/Fitness-Platform/blob/3fad91891bbd7e80b37cd95df682b3cc6900beaf/supabase/functions/validate_qr_token/index.ts): autentica funcionário e verifica unidade/validade/uso. Usa `service_role` e chamadas separadas para consumir token, criar presença e processar conquistas. O update inspecionado não faz compare-and-set de `used=false` nem agrupa o fluxo em uma única transação.
- A implicação para uma adaptação é risco de disputa ou falha parcial; não é uma afirmação de exploração demonstrada em produção. Preservar a transação PostgreSQL do Dojo OS.
- Não copiar componentes, SQL nem Edge Functions deste snapshot enquanto a licença permanecer sem confirmação.

## Mapa de módulos do Dojo OS

| Módulo | Fonte/estratégia | Ação |
|---|---|---|
| Cadastro, lista e vínculo de aluno | Dojo OS atual; MAM/Tatami como candidatos de UI | Preservar o que já funciona; adaptar apenas para um problema observado |
| OWNER/COACH/STUDENT e multi-academia | Memberships + RLS atuais | Preservar; não importar administrador global nem tenant padrão `main` |
| Check-in e histórico | RPC + ledger atuais | Preservar fonte e transação; QR deve entrar por esse mesmo caminho |
| QR | UI MIT do MAM como candidato; fluxo de token curto como requisito próprio | Próximo módulo sugerido; contrato em [CHECK_IN_REUSE_REVIEW.md](CHECK_IN_REUSE_REVIEW.md) |
| Faixa e futura graduação manual | Enum atual; estudar UI MIT do Tatami/MAM | Faixa separada de XP; graduação histórica só em etapa específica |
| Retenção/inatividade | Função atual; DojoUK como referência funcional | Evoluir com regra própria, sem importar os limites 2/4 semanas automaticamente |
| Dashboard do professor | UI atual + necessidades do piloto | Melhorar legibilidade/ação com dados reais; não copiar dashboard inteiro |
| Streak, metas, conquistas e ranking | Domínio próprio sobre ledger | Especificar separadamente; só os três marcos atuais estão implementados |
| Turmas/horários | Candidatos de UI/domínio Tatami/MAM | Backlog; exige nova modelagem e regras próprias de presença |
| Responsáveis, capacidade e espera | DojoUK como referência funcional | Backlog; sem importação de código nesta estratégia |
| Pagamentos, competições e PWA offline | Novas etapas independentes | Não trazer como dependência de QR/cadastro/retenção |

## Como decidir entre reutilizar e implementar

1. **Manter:** o módulo existente atende ao requisito; a alternativa não apresenta benefício concreto.
2. **Adaptar trecho MIT:** existe componente/função delimitado, licença verificada, dependências compatíveis e custo de adaptação menor que o de implementação e manutenção próprias.
3. **Usar biblioteca:** a necessidade é genérica (por exemplo, codificar/ler QR); verificar licença e API da biblioteca, em vez de reproduzir o algoritmo.
4. **Implementar integração do Dojo OS:** autorização, schema, transações, ledger e regras específicas não correspondem ao doador. Documentar a diferença e testar o contrato local.
5. **Adiar incorporação:** licença ausente/incompatibilidade não resolvida, testes insuficientes ou escopo que expande o produto sem necessidade para o piloto.

Para código incorporado, manter os avisos completos, registrar o commit e os arquivos em [REUSE_LOG.md](REUSE_LOG.md), adaptar nomes/permissões e validar o comportamento. Não criar um fork interno de um ERP para obter um componente de QR.

## Ordem proposta para próximas entregas

1. QR integrado ao check-in atual, com expiração e consumo transacional, se for o próximo problema de operação do piloto.
2. Retenção comparando frequência recente com o padrão do próprio aluno, com amostra mínima e explicação visível. Começar com regra transparente; sem ML.
3. Streak semanal e meta simples a partir do ledger, respeitando dias de descanso. Definir frequência/meta antes de conceder novas recompensas.
4. Graduação manual/turmas apenas quando necessárias ao piloto; financeiro e demais módulos continuam separados.

Essa ordem é planejamento, não uma lista de funcionalidades já entregues. A pontuação atual permanece **10 XP por treino**: três presenças válidas concedem 30 XP. O exemplo de 150 XP/semana não é uma mudança de regra.

## Pedido padrão para uma etapa de implementação

> Leia AGENTS.md, o módulo atual e as referências aprovadas em docs/OPEN_SOURCE_REFERENCE.md. Para o requisito desta etapa, compare os arquivos reais e os snapshots, permissões, schema, transações, dependências, UX e testes. Escolha a menor adaptação útil. Reutilize trechos com licença verificada quando isso reduzir trabalho sem enfraquecer o sistema. Preserve atribuições e registre a origem em docs/REUSE_LOG.md. Não substitua o ledger, a RLS ou o vínculo de aluno existente. Implemente somente esta etapa, execute as verificações pertinentes e relate os resultados e limites reais.
