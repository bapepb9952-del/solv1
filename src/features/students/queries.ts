import "server-only";
import { academyContext, requireStaff } from "@/lib/auth/session";
import type { StudentMetrics } from "@/lib/supabase/types";
import { studentMetricsSchema } from "./schema";
import { retentionStatus } from "@/features/retention/service";
import { notFound } from "next/navigation";
import { z } from "zod";

export async function listStudents(academyId: string) {
  const { client } = await requireStaff(academyId);
  const rows: StudentMetrics[] = [];
  // Supabase caps responses: fetch all batches before computing dashboard totals.
  for (let from = 0; ; from += 500) {
    const { data, error } = await client.from("student_metrics").select("*")
      .eq("academy_id", academyId).order("full_name").order("id").range(from, from + 499);
    if (error) throw new Error("Não foi possível carregar os alunos.");
    rows.push(...data.map((row) => studentMetricsSchema.parse(row)));
    if (data.length < 500) break;
  }
  return rows.map((student) => ({ ...student, retention: retentionStatus({
    lastTrainingOn: student.last_training_on, joinedOn: student.joined_on, today: student.today,
  }) }));
}
export type StudentWithRetention = Awaited<ReturnType<typeof listStudents>>[number];

export async function getStudent(academyId: string, studentId: string) {
  if (!z.uuid().safeParse(studentId).success) notFound();
  const { client } = await academyContext(academyId);
  const { data, error } = await client.from("student_metrics").select("*")
    .eq("academy_id", academyId).eq("id", studentId).maybeSingle();
  if (error) throw new Error("Não foi possível carregar o perfil.");
  if (!data) notFound();
  return studentMetricsSchema.parse(data);
}
