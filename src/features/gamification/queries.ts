import "server-only";
import { academyContext } from "@/lib/auth/session";

export async function studentHistory(academyId: string, studentId: string, page = 1) {
  const { client } = await academyContext(academyId);
  const from = (page - 1) * 20;
  const [events, unlocks, catalog] = await Promise.all([
    client.from("gamification_events").select("*", { count: "exact" }).eq("academy_id", academyId)
      .eq("student_id", studentId).order("created_at", { ascending: false }).order("id").range(from, from + 19),
    client.from("student_achievements").select("*").eq("academy_id", academyId).eq("student_id", studentId),
    client.from("achievements").select("*").order("required_sessions"),
  ]);
  if (events.error || unlocks.error || catalog.error) throw new Error("Não foi possível carregar o histórico.");
  return { events: events.data, count: events.count ?? 0, unlocks: unlocks.data, catalog: catalog.data };
}
