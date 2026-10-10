export type ActionState = { error?: string; success?: string };
export function databaseError(code: string | undefined, fallback: string): ActionState {
  const messages: Record<string, string> = {
    "42501": "Você não tem permissão para esta ação.",
    "23505": "Esta conta já está vinculada a um aluno nesta academia.",
    "P0002": "Este e-mail precisa ter uma conta confirmada. O aluno pode criar a conta na tela de acesso.",
    "P0003": "Este aluno já tem um acesso vinculado. Não é possível substituí-lo por outra conta.",
    "22023": "Confira os dados. Uma conta de professor não pode ser vinculada como aluno na mesma academia.",
  };
  return { error: messages[code ?? ""] ?? fallback };
}
