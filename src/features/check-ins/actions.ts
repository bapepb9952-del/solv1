"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { academyContext } from "@/lib/auth/session";
import { checkInResultSchema, ACHIEVEMENT_NAMES } from "@/features/gamification/schema";
import { databaseError, type ActionState } from "@/lib/actions";

export async function checkInAction(academyId: string, studentId: string): Promise<ActionState> {
  if (!z.uuid().safeParse(studentId).success) return { error: "Aluno indisponível." };
  const { client } = await academyContext(academyId);
  const { data, error } = await client.rpc("record_check_in", { p_academy_id: academyId, p_student_id: studentId });
  if (error) return databaseError(error.code, "Não foi possível registrar. Confira sua conexão e tente novamente.");
  const parsed = checkInResultSchema.safeParse(data);
  if (!parsed.success) return { error: "Não foi possível confirmar o resultado. Atualize o perfil antes de tentar novamente." };
  revalidatePath(`/a/${academyId}`, "layout");
  const result = parsed.data;
  if (result.already_checked_in) return { success: "O treino de hoje já está registrado." };
  const achievements = result.achievements.map((code) => ACHIEVEMENT_NAMES[code] ?? code);
  return { success: `Treino registrado. +10 XP!${achievements.length ? ` Conquista: ${achievements.join(", ")}.` : ""}` };
}
