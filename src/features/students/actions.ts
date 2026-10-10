"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { studentAccessSchema, studentSchema } from "./schema";
import { databaseError, type ActionState } from "@/lib/actions";

export async function registerStudentAction(academyId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { client } = await requireStaff(academyId);
  const parsed = studentSchema.safeParse({ fullName: form.get("fullName"), belt: form.get("belt"), email: String(form.get("email") ?? "").trim() });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const { data, error } = await client.rpc("register_student", {
    p_academy_id: academyId, p_full_name: parsed.data.fullName, p_belt: parsed.data.belt, p_email: parsed.data.email || null,
  });
  if (error || !data) return databaseError(error?.code, "Não foi possível cadastrar o aluno. Tente novamente.");
  revalidatePath(`/a/${academyId}`, "layout");
  redirect(`/a/${academyId}/students/${data}`);
}

export async function linkStudentAccessAction(academyId: string, studentId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const parsed = studentAccessSchema.safeParse({ academyId, studentId, email: form.get("email") });
  if (!parsed.success) return { error: "Informe um e-mail válido para vincular o acesso." };
  const { client } = await requireStaff(parsed.data.academyId);
  const { error } = await client.rpc("link_student_access", {
    p_academy_id: parsed.data.academyId, p_student_id: parsed.data.studentId, p_email: parsed.data.email,
  });
  if (error) return databaseError(error.code, "Não foi possível vincular o acesso. Tente novamente.");
  revalidatePath(`/a/${academyId}`, "layout");
  revalidatePath("/academies");
  return { success: "Acesso vinculado. O aluno já pode entrar e acompanhar seu progresso. O histórico foi preservado." };
}
