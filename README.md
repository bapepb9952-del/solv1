# Dojo OS · MVP 0.1

SaaS multi-tenant de frequência, engajamento e retenção para academias de jiu-jitsu.

**Loop:** aluno → check-in → +10 XP → progresso → conquista → próximo treino.

Este projeto implementa autenticação, criação de academia, cadastro e lista de alunos, check-in, ledger de XP, conquistas, perfil, histórico paginado e dashboard do professor. A interface é responsiva e está em português. Não inclui financeiro, cobrança, agenda de aulas ou graduação automática.

## Comece aqui

Você precisa de **Node.js 22 ou superior**, npm e um projeto Supabase. Para rodar tudo localmente, precisa também do Docker Desktop/Engine em execução. Sem Docker, use a opção de Supabase hospedado abaixo.

```bash
cd dojo-os
npm ci
cp .env.example .env.local
```

No PowerShell, substitua `cp` por `Copy-Item .env.example .env.local`. O CLI do Supabase já é uma dependência de desenvolvimento; não é necessário instalar globalmente.

### Opção A — Supabase local

Com o Docker iniciado:

```bash
npm run db:start
```

Na primeira inicialização, o CLI baixa os containers, cria o banco e aplica as migrations pendentes. Confirme que todas as migrations foram aplicadas:

```bash
npm run db:migrate
npx supabase status
```

O comando `status` mostra as credenciais locais. Copie os valores para `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=COLE_A_CHAVE_ANON_LOCAL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=COLE_A_CHAVE_SERVICE_ROLE_LOCAL
SEED_DEMO=true
DEMO_PASSWORD=ESCOLHA_UMA_SENHA_DE_PELO_MENOS_12_CARACTERES
```

Não use os textos de exemplo como senha/chaves. A chave `anon` local é aceita no campo `PUBLISHABLE_KEY`. Nunca use `service_role` no campo público. As chaves locais geradas pelo CLI podem ser exibidas como `anon`/`service_role` ou nas seções de autenticação do comando `status`.

Em seguida:

```bash
npm run seed
npm run dev
```

Abra **http://localhost:3000**. O painel local do Supabase fica em **http://127.0.0.1:54323** e a caixa de e-mails de teste em **http://127.0.0.1:54324**.

O projeto mantém confirmação de e-mail habilitada. Os usuários criados pelo seed já estão confirmados. Cadastros feitos pela interface recebem o link na caixa de e-mails local.

Para parar os serviços locais sem apagar os dados:

```bash
npx supabase stop
```

### Opção B — Supabase hospedado

1. Crie um projeto Supabase dedicado ao piloto, com PostgreSQL 15 ou superior.
2. Em **Settings → API / API Keys**, obtenha a URL, a chave pública `sb_publishable_...` ou `anon`, e a chave legada `service_role` para o seed.
3. Em **Authentication → URL Configuration**, configure `http://localhost:3000` como Site URL e adicione `http://localhost:3000/auth/confirm` às URLs permitidas.
4. Mantenha o provedor de e-mail/senha e confirmação de e-mail habilitados.
5. Vincule o CLI e aplique as migrations, substituindo `SEU_PROJECT_REF` pelo identificador real:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npm run db:push
```

O CLI pode solicitar a senha do banco. Não a coloque no código. Se preferir não usar o CLI, execute **uma única vez**, em ordem, o conteúdo de cada arquivo em `supabase/migrations/` no SQL Editor. Use apenas um dos métodos para aplicar a primeira versão, para não divergir do histórico do CLI.

Preencha `.env.local` com os valores do projeto:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=SUA_CHAVE_SERVICE_ROLE
SEED_DEMO=true
DEMO_PASSWORD=SUA_SENHA_DEMO_COM_12_OU_MAIS_CARACTERES
```

Rode:

```bash
npm run seed
npm run dev
```

O seed usa a API administrativa de Auth e a API de dados. Não precisa da senha PostgreSQL nem de uma conexão TCP direta.

## Entrar na demonstração

| Acesso | E-mail | Papel |
|---|---|---|
| Professor | `professor@demo.dojo.test` | `COACH` |
| Responsável | `owner@demo.dojo.test` | `OWNER` |
| Aluna: Marina Costa | `aluno@demo.dojo.test` | `STUDENT` |

Todas usam a senha definida em **DEMO_PASSWORD na primeira execução**. Não existe senha fixa no repositório. O seed não exibe nem redefine senhas.

Selecione **Black Lotus Jiu-Jitsu**. O seed cria 10 alunos fictícios, 119 presenças, os respectivos eventos de +10 XP e conquistas. Na data inicial há 4 alunos ativos, 3 em atenção e 3 em risco. Rafael já treinou hoje; Marina está disponível para testar um novo check-in.

Os dados usam IDs determinísticos e a data de criação da academia como referência. Repetir `npm run seed` preserva dados anteriores e completa etapas que eventualmente falharam. Datas não avançam ao repetir: o status dos alunos muda naturalmente com o tempo. Não use a aplicação até o seed concluir todas as etapas, pois a carga é feita por chamadas sequenciais à API, não por uma única transação. Essa limitação afeta somente a carga de demonstração; o check-in do produto é transacional.

Depois de popular a demonstração, pode remover `SUPABASE_SERVICE_ROLE_KEY` do ambiente da aplicação e voltar `SEED_DEMO=false`. A aplicação web usa apenas a chave pública e a sessão autenticada.

## Roteiro de validação do MVP

1. Entre com `professor@demo.dojo.test` e escolha Black Lotus.
2. Confira total de alunos, presenças hoje/7 dias e os três status de retenção.
3. Clique em **Novo aluno**, informe nome e faixa, deixe o e-mail vazio e salve.
4. O perfil deve começar com 0 XP, 0 treinos e histórico vazio.
5. Clique em **Registrar treino · +10 XP**.
6. Confira 10 XP, 1 treino e a conquista **Primeiro passo**.
7. O histórico deve mostrar presença (+10 XP) e conquista (sem bônus de XP).
8. O botão passa para **Treinou hoje**. Uma segunda requisição ao banco retorna sucesso idempotente, sem outro XP.
9. Volte ao dashboard: aluno, presença e indicadores estão atualizados.
10. Saia e entre com `aluno@demo.dojo.test`. Essa conta acessa somente o perfil da Marina e pode registrar a própria presença.
11. Para testar um novo tenant, crie uma academia com a conta responsável. O dashboard começa vazio e os alunos da Black Lotus não aparecem.

O banco e as regras têm testes automatizados. O fluxo completo com e-mail, navegador e Supabase Auth real deve ser executado neste roteiro depois da configuração do seu projeto.

## Contas reais e criação de academia

- A tela **Criar uma conta** registra um usuário no Supabase Auth. Confirme o e-mail e entre.
- Em **Suas academias → Criar academia**, informe o nome e o fuso. A criação também registra o usuário como `OWNER` da nova academia, na mesma transação.
- Um usuário pode participar de várias academias com papéis diferentes.
- `OWNER` e `COACH` podem consultar alunos, cadastrar e registrar presenças na própria academia.
- `STUDENT` só pode ler o próprio cadastro, presenças, eventos e conquistas; pode registrar a própria presença.
- Um aluno sem login pode ser cadastrado normalmente. Ao informar um e-mail de uma conta confirmada, o cadastro já será vinculado. Se a conta não existir ou ainda não estiver confirmada, o aluno será cadastrado sem acesso; confirme a conta e faça o vínculo posteriormente.
- Para vincular um aluno existente, entre como responsável ou professor, abra **Alunos → perfil do aluno → Vincular acesso**, informe o e-mail da conta confirmada e clique em **Confirmar vínculo**. O aluno continua com o mesmo ID, faixa, treinos, XP e conquistas. Não é permitido substituir um acesso existente nem vincular a mesma conta a dois alunos na mesma academia.
- Ao entrar, um usuário com papel somente de aluno em uma academia vai diretamente ao próprio perfil. Se participar de mais de uma academia como aluno, escolhe sua jornada sem ação de criar academia. Contas que também são responsáveis/professores conservam a seleção de academias e seus papéis por academia.
- O formulário não cria senha nem envia convites; e-mails pendentes não ficam armazenados no cadastro. A administração de professores ainda não tem tela nesta versão. O piloto pode operar com seu `OWNER` como professor, e o seed já inclui um `COACH`.

### Atualizar um projeto hospedado que já usa a V0.1

1. No Supabase, abra **SQL Editor → New query** no projeto correto.
2. Copie integralmente `supabase/migrations/202610100001_student_access.sql` e execute uma única vez. Essa migration é transacional e não apaga tabelas, alunos ou histórico. Não repita as duas migrations anteriores.
3. Mantenha RLS habilitada e o schema `private` fora dos schemas expostos pela Data API. Não edite linhas de `students` ou `memberships` manualmente.
4. Publique os arquivos atualizados do aplicativo na branch usada pela Vercel e aguarde o novo deployment. Se a publicação automática estiver desligada, faça um novo deployment da versão atualizada; redeploy de uma versão antiga não inclui a funcionalidade.
5. Mantenha as variáveis públicas existentes. O vínculo não exige novas variáveis, senha do banco, Admin API ou `service_role`.
6. Em **Authentication → Users**, confira que a conta do aluno confirmou o e-mail. Se necessário, conclua a confirmação pelo e-mail recebido antes de fazer o vínculo na aplicação.
7. No perfil do aluno existente, anote XP/treinos/conquistas, vincule o acesso e confirme que os valores não mudaram. Saia e entre com a conta do aluno; confira o próprio perfil e a ausência de controles administrativos.

Quem gerencia migrations com o CLI deve aplicar a nova migration pelo fluxo habitual de `supabase db push`, com o projeto correto vinculado. Quem instalou pelo SQL Editor deve continuar pelo SQL Editor; não misture os métodos sem reconciliar o histórico.

Para a confirmação de e-mail, a rota `/auth/confirm` aceita o fluxo PKCE (`code`) e confirmação com `token_hash`. O template padrão do Supabase funciona no mesmo navegador que iniciou o cadastro. Para confirmação em outro navegador, use o template de confirmação com:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirmar e-mail</a>
```

Configure o domínio correto no Site URL quando hospedar a aplicação.

## Regras de negócio

### Check-in e XP

- Uma presença por **aluno + academia + dia no fuso da academia**.
- Padrão de fuso: `America/Sao_Paulo`. O relógio do PostgreSQL é a referência.
- `record_check_in` recebe apenas IDs de academia e aluno. Não aceita XP, data ou autor fornecido pelo cliente.
- O banco verifica a permissão, bloqueia a linha do aluno, insere a presença, grava o evento de +10 XP e verifica conquistas na mesma transação.
- A constraint única por dia é a proteção final contra repetição. Nova tentativa retorna `xp_awarded: 0` e `already_checked_in: true`.
- `gamification_events` é a fonte histórica de XP. O total é a soma de `xp_delta`; não há cache nem incremento separado no cadastro.
- Presenças, ledger e desbloqueios são append-only. Updates/deletes são bloqueados por trigger, inclusive em operações administrativas normais. Correções futuras devem usar novos tipos de evento e migrations próprias.
- `metadata.rule_version = 1` identifica a regra inicial. Nenhuma conquista concede XP adicional.

### Frequência e retenção

As janelas de 7/30 dias usam **dias de calendário**, incluindo hoje: hoje−6 até hoje e hoje−29 até hoje. Não são janelas de 168/720 horas. Todas usam o fuso da academia.

| Estado | Dias desde último treino |
|---|---|
| `ACTIVE` · Ativo | 0 a 7 |
| `ATTENTION` · Atenção | 8 a 14 |
| `RISK` · Em risco | 15 ou mais |

Para aluno sem presença, usa-se a data de cadastro. O perfil informa esse fallback. Um aluno recém-cadastrado aparece ativo mesmo sem treino; o dashboard explica que a medida é tempo de ausência/cadastro.

A regra está isolada em `src/features/retention/service.ts` com versão e limites explícitos. Não há ML nem previsão de cancelamento. O indicador serve para orientar uma conversa.

Streaks estão preparados por meio de presenças com data local e histórico de eventos. A interface mostra total de treinos, últimos 7/30 dias e último treino. Não existe promessa de sequência diária ou ranking nesta versão.

### Conquistas e faixas

| Código | Nome | Critério |
|---|---|---|
| `FIRST_ROLL` | Primeiro passo | 1 treino |
| `TEN_SESSIONS` | Criando constância | 10 treinos |
| `THIRTY_SESSIONS` | Presença de respeito | 30 treinos |

Os desbloqueios têm chave única por academia, aluno e conquista. Eventos de conquista são registrados no ledger com 0 XP.

Faixas: `WHITE`, `BLUE`, `PURPLE`, `BROWN`, `BLACK`. **XP não promove faixa. A graduação permanece uma decisão do professor.**

## Arquitetura

Monólito modular: Next.js App Router, TypeScript estrito, Tailwind CSS 4 e CSS de componentes, Supabase Auth, PostgreSQL e Supabase SSR. Sem ORM adicional e sem backend separado.

```text
src/
  app/
    (auth)/                     login e cadastro
    (app)/academies/             seleção e criação de academia
    (app)/a/[academyId]/
      dashboard/                visão do professor
      students/                 lista, cadastro e perfil
      me/                       redirecionamento do aluno
    auth/confirm/               confirmação de e-mail
    setup/                      orientação sem ambiente configurado
    manifest.ts                 base para futura PWA
  components/                   UI, formulários, navegação e check-in
  features/
    academies/                  schema e ações
    students/                   schema, ações e consultas
    check-ins/                  ação autenticada de presença
    gamification/               histórico e contrato do RPC
    retention/                  regra pura e versionada
  lib/
    auth/                       sessão e contexto da academia
    dates/                      datas de calendário e formatação
    supabase/                   SSR, ambiente, tipos SQL e tipos de domínio
  proxy.ts                      atualização segura dos cookies da sessão
supabase/
  config.toml                   ambiente Supabase local
  migrations/
    202610090001_core.sql        tabelas, índices, constraints, RLS
    202610090002_workflows.sql   RPCs e view de métricas
scripts/
  demo-data.ts                  fixtures determinísticas
  seed.ts                       carga via API administrativa
  generate-types.ts             atualização segura de tipos
tests/
  retention.test.ts             limites, calendário e fuso
  database.test.ts              PostgreSQL, RLS, transações e demo
  demo.test.ts                  consistência do seed e validação
```

O servidor renderiza os dados autenticados. Componentes cliente cuidam de filtros, formulários e feedback de check-in. Server Actions validam entradas e chamam RPCs usando a sessão do usuário. Após mutações, o caminho da academia é invalidado e a tela é atualizada. Não há cache global compartilhando dados de usuários.

### Schema PostgreSQL

| Tabela | Chaves e responsabilidades |
|---|---|
| `auth.users` | Identidade e autenticação geridas pelo Supabase |
| `academies` | UUID, nome, timezone, criador |
| `memberships` | PK `(academy_id, user_id)` e papel |
| `students` | UUID, academia, nome, faixa, usuário opcional; FK composta para membership |
| `check_ins` | Academia, aluno, dia local, instante, autor; único por academia/aluno/dia |
| `gamification_events` | Ledger com tipo, XP, instante, metadata e ligação à presença/conquista |
| `achievements` | Catálogo global de regras, sem dados de clientes |
| `student_achievements` | PK `(academy_id, student_id, achievement_code)` |

`student_metrics` é uma view **security_invoker**, com agregações separadas de presenças e eventos, evitando multiplicar XP por joins. Índices cobrem academia/aluno, dia local, nome e histórico.

`auth.users` representa o conceito de usuário. Não há uma tabela `profiles` duplicando credenciais ou informações de autenticação. Todos os registros privados da academia contêm `academy_id`; o catálogo de conquistas é a única tabela de domínio global.

### Isolamento e autorização

- RLS habilitada em todas as tabelas públicas. `anon` não recebe acesso a dados nem a RPCs.
- `authenticated` tem somente `SELECT` nas tabelas; escritas do MVP passam por funções SQL específicas.
- Helpers privados consultam a membership atual do banco. Um valor de papel enviado pelo navegador ou em metadata de Auth não concede privilégios.
- Funções `SECURITY DEFINER` usam `search_path = ''`, nomes de tabelas qualificados e verificação explícita de identidade/permissão.
- O schema `private` **não deve ser adicionado aos schemas expostos pela API**.
- Chaves estrangeiras compostas impedem referências entre academias mesmo em erros de implementação.
- A view conserva a RLS das tabelas de origem. Um aluno não pode usar a view para acessar estatísticas de outros alunos.
- A aplicação verifica usuário com `auth.getUser()` e autoriza cada academia no servidor; a RLS repete essa proteção no banco.
- A `service_role` fica restrita ao script de seed e nunca entra no bundle web. Ela ignora RLS por definição e não é utilizada nas rotas.
- Há headers contra framing e content sniffing. Server Actions usam as verificações de origem do Next.js. A confirmação de e-mail redireciona apenas para rotas fixas.

## Verificações

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Ou execute tudo, na mesma ordem:

```bash
npm run check
```

O lint falha também em warnings. `typecheck` usa `strict` e `noUncheckedIndexedAccess`. O lockfile versiona as dependências resolvidas.

Os testes de banco executam **as migrations sem alterações** em PGlite (PostgreSQL compilado para WebAssembly), com papéis `anon`, `authenticated`, `service_role` e um contrato mínimo de `auth.uid()`. Cobrem permissões de leitura/escrita, isolamento em duas academias, visualização restrita do aluno, FKs, ledger, idempotência, marcos de 1/10/30 treinos, janelas de datas, rollback e carga do seed duas vezes.

Isso testa SQL e RLS reais, mas **não substitui** Supabase Auth, PostgREST, envio de e-mail e testes de navegador. PGlite usa uma conexão: concorrência entre conexões PostgreSQL distintas não é simulada. A implementação usa lock por aluno e constraint única para esse cenário, que deve ser validado adicionalmente se o piloto exigir testes de carga.

O ambiente de desenvolvimento desta entrega não fornecia Docker nem um projeto Supabase configurado. Portanto a autenticação remota, o seed via API real e a inspeção visual em navegador não foram executados aqui. Os resultados automatizados estão em `docs/VERIFICATION.md`.

Para acompanhar alterações de schema com o Supabase local iniciado:

```bash
npm run db:types
npm run typecheck
```

O gerador só sobrescreve o arquivo de tipos se o CLI concluir com sucesso. Tipos de domínio ficam separados, e resultados da view são validados em runtime.

## Build e execução de produção

Configure as variáveis públicas corretas **antes do build**:

```bash
npm ci
npm run check
npm run start
```

`npm run check` já inclui o build. A aplicação pode ser hospedada em um ambiente com suporte ao runtime do Next.js. Não é um export estático. Para domínio definitivo, ajuste `NEXT_PUBLIC_SITE_URL`, Site URL e Redirect URLs do Supabase e reconstrua a aplicação. Use HTTPS.

Não publique o banco de demonstração com senhas conhecidas. Para o piloto real, use o ambiente configurado para a academia, contas próprias e sem a chave administrativa nas variáveis da aplicação.

## Solução de problemas

| Sintoma | O que verificar |
|---|---|
| Tela “Conecte seu Supabase” | URL e chave pública em `.env.local`; reinicie o dev server |
| “Could not find function” / tabela inexistente | Aplique as duas migrations no mesmo projeto das variáveis de ambiente |
| Login falha | E-mail confirmado, senha escolhida no primeiro seed, URL e chaves do mesmo projeto |
| Confirmação expirada | Use o e-mail mais recente; o link é de uso único; revise o template e as Redirect URLs |
| Seed bloqueado | `SEED_DEMO=true`, senha própria com 12+ caracteres e chave `service_role` |
| Seed falhou no meio | Corrija o erro e rode novamente antes de usar a demonstração; não redefine senhas |
| Conta já existe sem identificação demo | O script se recusa a alterar usuários preexistentes; use um projeto dedicado ao piloto |
| Acesso do aluno não vinculado | O aluno precisa criar e confirmar conta; depois o professor usa “Vincular acesso” no perfil existente |
| RPC retorna permission denied | Confira membership e papel; não remova RLS para contornar o erro |
| Docker indisponível | Use Supabase hospedado; testes unitários/SQL locais não dependem de Docker |
| Ambiente atualizado, tela antiga | Reinicie `npm run dev`; em produção refaça o build para mudar variáveis públicas |

## Limites intencionais da V0.1

- Sem temporadas, rankings, desafios, mensagens, cobrança, edição/remoção de alunos, graduação automática ou configuração visual de regras.
- Sem agenda ou confirmação física de presença: o próprio aluno pode fazer um check-in diário. QR code/validação do professor ficam para uma próxima decisão de produto.
- Sem sequência diária calculada: existem os dados necessários e as métricas simples solicitadas.
- Sem funcionamento offline. Manifesto e ícone preparam a evolução para PWA; não há service worker nem cache de dados privados.
- O dashboard busca métricas em lotes de 500 para não truncar a resposta padrão do Supabase, e agrega no servidor. Isso é adequado ao piloto; academias muito grandes exigirão agregações paginadas/SQL adicionais.
- O histórico é paginado em 20 eventos. O fuso e o catálogo são definidos na criação/migrations e não têm tela de edição.
- O seed é ferramenta de demonstração, não sistema de importação de alunos de produção.

## Referências de implementação

- [Supabase SSR para Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy)

Essas referências fundamentam o fluxo de cookies, a validação de sessão e as permissões do banco. As regras de jiu-jitsu e retenção são as decisões explícitas deste MVP.
