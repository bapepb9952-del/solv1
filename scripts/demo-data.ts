import { createHash } from "node:crypto";
import type { Belt, CheckIn, GameEvent, Student, Unlock } from "../src/lib/supabase/types";

export const DEMO_ACADEMY_ID = "b1ac1000-0000-4000-a000-000000000001";
export const DEMO_TIMEZONE = "America/Sao_Paulo";
export const DEMO_ACCOUNTS = [
  { email: "owner@demo.dojo.test", role: "OWNER" },
  { email: "professor@demo.dojo.test", role: "COACH" },
  { email: "aluno@demo.dojo.test", role: "STUDENT" },
] as const;
const SPECS: { name: string; belt: Belt; sessions: number; lastDaysAgo: number | null }[] = [
  { name: "Rafael Almeida", belt: "BLACK", sessions: 34, lastDaysAgo: 0 },
  { name: "Marina Costa", belt: "BLUE", sessions: 22, lastDaysAgo: 1 },
  { name: "Pedro Nascimento", belt: "PURPLE", sessions: 12, lastDaysAgo: 2 },
  { name: "Camila Rocha", belt: "WHITE", sessions: 9, lastDaysAgo: 5 },
  { name: "Bruno Ferreira", belt: "BROWN", sessions: 14, lastDaysAgo: 8 },
  { name: "Juliana Santos", belt: "WHITE", sessions: 6, lastDaysAgo: 11 },
  { name: "Diego Martins", belt: "BLUE", sessions: 18, lastDaysAgo: 14 },
  { name: "Larissa Oliveira", belt: "PURPLE", sessions: 3, lastDaysAgo: 17 },
  { name: "Felipe Lima", belt: "WHITE", sessions: 1, lastDaysAgo: 24 },
  { name: "Beatriz Ribeiro", belt: "WHITE", sessions: 0, lastDaysAgo: null },
];

export function deterministicId(key: string): string {
  const hex = createHash("sha256").update(`dojo-os-v0.1:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
function dateBefore(anchor: string, days: number) {
  const date = new Date(`${anchor}T15:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

export function makeDemoData(anchor: string, coachUserId: string, studentUserId: string) {
  const students: Student[] = [];
  const checkIns: CheckIn[] = [];
  const events: GameEvent[] = [];
  const unlocks: Unlock[] = [];
  for (const [index, spec] of SPECS.entries()) {
    const studentId = deterministicId(`student:${index}`);
    students.push({
      id: studentId, academy_id: DEMO_ACADEMY_ID, user_id: index === 1 ? studentUserId : null,
      full_name: spec.name, belt: spec.belt,
      created_at: dateBefore(anchor, spec.sessions ? (spec.lastDaysAgo ?? 0) + spec.sessions * 2 + 7 : 19),
    });
    const trainingDates = Array.from({ length: spec.sessions }, (_, offset) => dateBefore(anchor, (spec.lastDaysAgo ?? 0) + offset * 2)).reverse();
    for (const timestamp of trainingDates) {
      const localDate = timestamp.slice(0, 10);
      const checkInId = deterministicId(`check-in:${studentId}:${localDate}`);
      checkIns.push({ id: checkInId, academy_id: DEMO_ACADEMY_ID, student_id: studentId, local_date: localDate, created_at: timestamp, recorded_by: coachUserId });
      events.push({ id: deterministicId(`event:${checkInId}`), academy_id: DEMO_ACADEMY_ID, student_id: studentId, event_type: "CHECK_IN", xp_delta: 10, check_in_id: checkInId, achievement_code: null, created_at: timestamp, metadata: { source: "demo_seed", rule_version: 1, local_date: localDate } });
    }
    for (const [threshold, code] of [[1, "FIRST_ROLL"], [10, "TEN_SESSIONS"], [30, "THIRTY_SESSIONS"]] as const) {
      const unlockedAt = trainingDates[threshold - 1];
      if (!unlockedAt) continue;
      unlocks.push({ academy_id: DEMO_ACADEMY_ID, student_id: studentId, achievement_code: code, unlocked_at: unlockedAt });
      events.push({ id: deterministicId(`unlock:${studentId}:${code}`), academy_id: DEMO_ACADEMY_ID, student_id: studentId, event_type: "ACHIEVEMENT_UNLOCKED", xp_delta: 0, check_in_id: null, achievement_code: code, created_at: unlockedAt, metadata: { source: "demo_seed", rule_version: 1, total_sessions: threshold } });
    }
  }
  return { students, checkIns, events, unlocks };
}
