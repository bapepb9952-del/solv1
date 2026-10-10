# Vínculo posterior de acesso do aluno

O tenant existente é `academies`; `academy_id` corresponde à organização. Não há um schema paralelo de organizations. O perfil pessoal reutiliza `student_metrics`, o catálogo de conquistas e o ledger existentes.

`linkStudentAccessAction` valida IDs/e-mail, exige a sessão atual com `requireStaff` e chama a RPC com o cliente Supabase da própria sessão. A RPC também valida o papel `OWNER`/`COACH` no banco, independentemente de qualquer dado enviado pelo navegador.

A migration `202610100001_student_access.sql` acrescenta uma RPC pública e um helper privado compartilhado com o cadastro. Ambos usam `SECURITY DEFINER` e `search_path = ''`. O helper privado não pode ser executado por `anon` ou `authenticated`; a RPC pública não pode ser executada por `anon`.

Antes de consultar `auth.users`, o helper verifica a autorização e bloqueia o Student correto por `academy_id` e `id`. O e-mail é normalizado, e somente uma conta confirmada é aceita no vínculo posterior. Nenhum dado ou listagem de `auth.users` é retornado. Não há Admin API nem chave administrativa na implementação.

A transação cria membership apenas como `STUDENT`, bloqueia a membership da conta, rejeita papéis administrativos e duplicidade de aluno na mesma academia. A constraint única `(academy_id, user_id)` e a FK composta para memberships permanecem como garantias finais. O mesmo usuário pode ter cadastros em academias diferentes, conforme o modelo anterior. Um vínculo existente não pode ser transferido para outra identidade por essa ação.

Somente `students.user_id` é alterado no cadastro existente. O ID do Student, tenant, nome, faixa, datas, check-ins, eventos e conquistas não são alterados. Falhas desfazem também qualquer membership criada durante a tentativa. A RLS e os grants de escrita direta continuam inalterados.

No cadastro novo, a mesma lógica vincula contas confirmadas. A ausência de conta confirmada preserva o novo Student sem vínculo e sem membership. O e-mail pendente não é armazenado; após confirmar a conta, o professor informa novamente o e-mail no perfil.

Os testes PostgreSQL/PGlite cobrem conservação de 10 XP/1 treino/FIRST_ROLL, normalização, repetição, duplicidade, troca de identidade, tenant/ID incompatíveis, papel STUDENT, auth.users privado, escrita direta proibida, confirmação e novos cadastros. A implementação também foi validada contra Supabase local real: formulário/Server Action, páginas autenticadas, preservação do histórico e duas requisições concorrentes disputando o mesmo vínculo. Isso não substitui a validação do projeto hospedado ou um teste de carga.
