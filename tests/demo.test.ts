import { describe, expect, it } from "vitest";
import { makeDemoData } from "../scripts/demo-data";
import { retentionStatus } from "@/features/retention/service";
import { studentSchema } from "@/features/students/schema";
import { academySchema } from "@/features/academies/schema";
const data = makeDemoData("2026-10-09", "coach-id", "student-user-id");
describe("demo fixture", () => {
  it("has 10 students, 5 belt colors and all retention categories", () => {
    expect(data.students).toHaveLength(10);
    expect(new Set(data.students.map((s) => s.belt)).size).toBe(5);
    const counts: Record<string, number> = {};
    for (const s of data.students) {
      const dates = data.checkIns.filter((c) => c.student_id === s.id).map((c) => c.local_date).sort();
      const result = retentionStatus({ today: "2026-10-09", joinedOn: s.created_at.slice(0, 10), lastTrainingOn: dates.at(-1) ?? null });
      counts[result.status] = (counts[result.status] ?? 0) + 1;
    }
    expect(counts).toEqual({ ACTIVE: 4, ATTENTION: 3, RISK: 3 });
  });
  it("has one +10 event per check-in and no duplicate day/unlock", () => {
    expect(new Set(data.checkIns.map((c) => `${c.student_id}:${c.local_date}`)).size).toBe(data.checkIns.length);
    expect(new Set(data.unlocks.map((u) => `${u.student_id}:${u.achievement_code}`)).size).toBe(data.unlocks.length);
    for (const checkIn of data.checkIns) {
      const events = data.events.filter((e) => e.check_in_id === checkIn.id);
      expect(events).toHaveLength(1);
      expect(events[0]?.xp_delta).toBe(10);
    }
    for (const unlock of data.unlocks) expect(data.events.some((e) => e.student_id === unlock.student_id && e.achievement_code === unlock.achievement_code)).toBe(true);
  });
  it("is deterministic so a retry does not recreate history", () => {
    expect(makeDemoData("2026-10-09", "coach-id", "student-user-id")).toEqual(data);
  });
});
describe("input validation", () => {
  it("accepts trimmed names and optional login, rejects unknown belts and bad email", () => {
    expect(studentSchema.parse({ fullName: "  Ana Silva  ", belt: "WHITE", email: "" }).fullName).toBe("Ana Silva");
    expect(studentSchema.safeParse({ fullName: "Ana", belt: "RED", email: "" }).success).toBe(false);
    expect(studentSchema.safeParse({ fullName: "Ana", belt: "WHITE", email: "not-an-email" }).success).toBe(false);
  });
  it("accepts IANA zones and rejects invalid ones", () => {
    expect(academySchema.safeParse({ name: "Black Lotus", timezone: "America/Sao_Paulo" }).success).toBe(true);
    expect(academySchema.safeParse({ name: "Black Lotus", timezone: "somewhere/invalid" }).success).toBe(false);
  });
});
