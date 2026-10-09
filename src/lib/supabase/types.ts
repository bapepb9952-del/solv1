import type { Database } from "./database.types";
export type { Json } from "./database.types";
export type Role = Database["public"]["Enums"]["academy_role"];
export type Belt = Database["public"]["Enums"]["belt"];
export type Academy = Database["public"]["Tables"]["academies"]["Row"];
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type CheckIn = Database["public"]["Tables"]["check_ins"]["Row"];
export type GameEvent = Database["public"]["Tables"]["gamification_events"]["Row"];
export type Unlock = Database["public"]["Tables"]["student_achievements"]["Row"];
// PostgreSQL views report nullable types even when aggregates are coalesced.
type RawMetrics = Database["public"]["Views"]["student_metrics"]["Row"];
type RequiredMetrics = { [K in keyof RawMetrics]: NonNullable<RawMetrics[K]> };
export type StudentMetrics = Omit<RequiredMetrics, "user_id" | "last_training_on" | "last_training_at"> & {
  user_id: string | null;
  last_training_on: string | null;
  last_training_at: string | null;
};
