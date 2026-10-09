// Kept in sync with versioned migrations. Regenerate with `npm run db:types`.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Role = "OWNER" | "COACH" | "STUDENT";
export type Belt = "WHITE" | "BLUE" | "PURPLE" | "BROWN" | "BLACK";
export type EventType = "CHECK_IN" | "ACHIEVEMENT_UNLOCKED";
export type Academy = { id: string; name: string; timezone: string; created_by: string; created_at: string };
export type Membership = { academy_id: string; user_id: string; role: Role; created_at: string };
export type Student = { id: string; academy_id: string; user_id: string | null; full_name: string; belt: Belt; created_at: string };
export type CheckIn = { id: string; academy_id: string; student_id: string; local_date: string; created_at: string; recorded_by: string };
export type Achievement = { code: string; name: string; description: string; required_sessions: number };
export type Unlock = { academy_id: string; student_id: string; achievement_code: string; unlocked_at: string };
export type GameEvent = { id: string; academy_id: string; student_id: string; event_type: EventType; xp_delta: number; check_in_id: string | null; achievement_code: string | null; created_at: string; metadata: Json };
export type StudentMetrics = Student & {
  timezone: string; today: string; joined_on: string; total_xp: number;
  total_check_ins: number; sessions_7d: number; sessions_30d: number;
  sessions_today: number; last_training_on: string | null; last_training_at: string | null;
};
type Table<Row, Required extends keyof Row> = {
  Row: Row; Insert: Pick<Row, Required> & Partial<Row>; Update: Partial<Row>; Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      academies: Table<Academy, "name" | "created_by">;
      memberships: Table<Membership, "academy_id" | "user_id" | "role">;
      students: Table<Student, "academy_id" | "full_name">;
      check_ins: Table<CheckIn, "academy_id" | "student_id" | "local_date" | "recorded_by">;
      achievements: Table<Achievement, "code" | "name" | "description" | "required_sessions">;
      student_achievements: Table<Unlock, "academy_id" | "student_id" | "achievement_code">;
      gamification_events: Table<GameEvent, "academy_id" | "student_id" | "event_type" | "xp_delta">;
    };
    Views: { student_metrics: { Row: StudentMetrics; Relationships: [] } };
    Functions: {
      create_academy: { Args: { p_name: string; p_timezone?: string }; Returns: string };
      register_student: { Args: { p_academy_id: string; p_full_name: string; p_belt?: Belt; p_email?: string | null }; Returns: string };
      record_check_in: { Args: { p_academy_id: string; p_student_id: string }; Returns: Json };
    };
    Enums: { academy_role: Role; belt: Belt; gamification_event_type: EventType };
    CompositeTypes: Record<string, never>;
  };
};
