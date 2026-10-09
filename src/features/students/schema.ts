import { z } from "zod";
import type { Belt } from "@/lib/supabase/types";

export const BELTS = ["WHITE", "BLUE", "PURPLE", "BROWN", "BLACK"] as const;
export const BELT_LABELS: Record<Belt, string> = { WHITE: "Branca", BLUE: "Azul", PURPLE: "Roxa", BROWN: "Marrom", BLACK: "Preta" };
export const studentSchema = z.object({
  fullName: z.string().trim().min(2, "Informe pelo menos 2 caracteres.").max(100),
  belt: z.enum(BELTS),
  email: z.union([z.email("Informe um e-mail válido."), z.literal("")]),
});

export const studentMetricsSchema = z.object({
  id: z.uuid(), academy_id: z.uuid(), user_id: z.uuid().nullable(),
  full_name: z.string(), belt: z.enum(BELTS), created_at: z.string(),
  timezone: z.string(), today: z.string(), joined_on: z.string(),
  total_xp: z.number(), total_check_ins: z.number(), sessions_7d: z.number(),
  sessions_30d: z.number(), sessions_today: z.number(),
  last_training_on: z.string().nullable(), last_training_at: z.string().nullable(),
});
