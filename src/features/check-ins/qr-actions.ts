"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { academyContext, requireStaff } from "@/lib/auth/session";
import { checkInResultSchema } from "@/features/gamification/schema";
import { qrIssuedSchema, qrPreviewSchema, qrStatusSchema, qrTokenSchema, type QrIssued, type QrPreview, type QrStatus } from "./qr-schema";

const errors: Record<string, string> = {
  "42501": "Este acesso não pode usar o QR nesta academia. Confira o vínculo e seu papel.",
  Q0001: "QR inválido ou de outra academia. Peça um novo QR ao aluno.",
  Q0002: "QR expirado. Peça ao aluno para gerar outro.",
  Q0003: "Este QR já foi utilizado. Confira o histórico do aluno.",
  Q0004: "Este QR foi substituído. Escaneie o QR mais recente do aluno.",
  Q0005: "Aguarde alguns segundos antes de tentar novamente. Há um limite de solicitações.",
};
function failure(code?: string) { return { error: errors[code ?? ""] ?? "Não foi possível confirmar o QR. Confira a conexão e tente novamente." }; }
function resultError(data: unknown): string | undefined {
  const parsed = z.object({ error_code: z.string() }).safeParse(data);
  return parsed.success ? parsed.data.error_code : undefined;
}
export async function issueQrAction(academyId: string, studentId: string): Promise<{ qr?: QrIssued; error?: string }> {
  if (!z.uuid().safeParse(academyId).success || !z.uuid().safeParse(studentId).success) return failure("42501");
  const { client, role } = await academyContext(academyId);
  if (role !== "STUDENT") return failure("42501");
  const { data, error } = await client.rpc("issue_check_in_qr", { p_academy_id: academyId, p_student_id: studentId });
  if (error) return failure(error.code);
  const parsed = qrIssuedSchema.safeParse(data);
  return parsed.success ? { qr: parsed.data } : failure();
}
export async function previewQrAction(academyId: string, payload: string): Promise<{ preview?: QrPreview; error?: string }> {
  const token = qrTokenSchema.safeParse(payload);
  if (!token.success) return failure("Q0001");
  const { client } = await requireStaff(academyId);
  const { data, error } = await client.rpc("preview_check_in_qr", { p_academy_id: academyId, p_token: token.data });
  if (error || resultError(data)) return failure(error?.code ?? resultError(data));
  const parsed = qrPreviewSchema.safeParse(data);
  return parsed.success ? { preview: parsed.data } : failure();
}
export async function redeemQrAction(academyId: string, payload: string): Promise<{ success?: string; error?: string; studentId?: string }> {
  const token = qrTokenSchema.safeParse(payload);
  if (!token.success) return failure("Q0001");
  const { client } = await requireStaff(academyId);
  const { data, error } = await client.rpc("redeem_check_in_qr", { p_academy_id: academyId, p_token: token.data });
  if (error || resultError(data)) return failure(error?.code ?? resultError(data));
  const parsed = checkInResultSchema.extend({ student_id: z.uuid() }).safeParse(data);
  if (!parsed.success) return failure();
  revalidatePath(`/a/${academyId}`, "layout");
  return { studentId: parsed.data.student_id, success: parsed.data.already_checked_in ? "O treino de hoje já estava registrado. QR consumido, sem XP duplicado." : "Treino confirmado pelo QR. +10 XP! Perfil, histórico e conquistas atualizados." };
}
export async function qrStatusAction(academyId: string, id: string): Promise<{ status?: QrStatus; error?: string }> {
  if (!z.uuid().safeParse(id).success) return failure("Q0001");
  const { client, role } = await academyContext(academyId);
  if (role !== "STUDENT") return failure("42501");
  const { data, error } = await client.rpc("check_in_qr_status", { p_academy_id: academyId, p_id: id });
  if (error) return failure(error.code);
  const parsed = qrStatusSchema.safeParse(data);
  return parsed.success ? { status: parsed.data } : failure();
}
