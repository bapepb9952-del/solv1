"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { studentSchema } from "./schema";
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
