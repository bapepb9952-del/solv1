# Verificação da entrega

## QR temporário — 12/10/2026

- Lint, typecheck e build de produção aprovados.
- 56 testes aprovados em 5 arquivos: 45 anteriores, 10 casos de QR/autorização/rollback e um teste de interoperabilidade real encoder/decoder.
- `npm run test:qr:postgres` aprovado contra PostgreSQL/Supabase local com conexões independentes: confirmação simultânea por dois funcionários, replay, QR contra manual, renovação contra resgate, expiração após espera de lock, isolamento e rollback completo seguido de retry.
- Chromium headless, viewport móvel 390×844: aluno gera QR, câmera simulada decodifica a imagem real, professor confere o nome e confirma, aluno recebe feedback e banco mantém 10 XP/1 treino/FIRST_ROLL. Não houve overflow horizontal no perfil testado.
- Câmera recusada oferece caminho manual; Permissions-Policy permite câmera na rota do scanner e bloqueia no dashboard; expiração visual esconde o QR; perda de rede não informa sucesso sem confirmação.
- Nova migration aplicada somente no Supabase local. Nenhuma migration executada no projeto hospedado e nenhuma alteração manual na Vercel.
- Não foi testada câmera física em Android/iOS com HTTPS, nem executado teste de carga. Câmera simulada não substitui esse teste no piloto. As instruções estão no README.
- Documentação do PR #1 incorporada; adaptação MIT e licenças das bibliotecas registradas em REUSE_LOG.md e public/licenses/.

## Atualização: vínculo posterior do aluno

Validação da implementação em Linux, Node.js 24.19.0 e npm 11.9.0:

- `npm run lint`, `npm run typecheck` e `npm run build`: aprovados.
- `npm test`: 45 testes aprovados em 3 arquivos, incluindo 14 novos casos de vínculo e autorização.
- Nova migration aplicada também ao Supabase local real, sem modificar as duas migrations anteriores.
- Formulário do professor submetido via HTTP à Server Action autenticada: vínculo concluído.
- Conta do aluno autenticada pelo Supabase Auth: perfil pessoal acessível, com redirecionamentos, nome/faixa/métricas/conquistas e sem controles administrativos; cadastro administrativo negado.
- Caso local equivalente ao teste real: mesmo Student manteve 10 XP, 1 treino e FIRST_ROLL; repetir check-in não concedeu XP.
- Duas requisições simultâneas de vínculo da mesma conta a alunos diferentes: uma aprovada e outra rejeitada com `23505`, com apenas um Student vinculado.
- Nenhum secret ou variável de ambiente foi alterado. O projeto Supabase hospedado e a Vercel não foram modificados.

Essa validação usou dados fictícios locais. O vínculo do “aluno teste” no projeto hospedado deve ser feito pelo professor após aplicar a nova migration e publicar o aplicativo. Navegador visual e envio de e-mail não foram testados nesta atualização.

## Verificação original da V0.1

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
