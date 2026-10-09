import { z } from "zod";
export const checkInResultSchema = z.object({
  already_checked_in: z.boolean(), xp_awarded: z.number(), total_xp: z.number(), achievements: z.array(z.string()),
});
export const ACHIEVEMENT_NAMES: Record<string, string> = {
  FIRST_ROLL: "Primeiro passo", TEN_SESSIONS: "Criando constância", THIRTY_SESSIONS: "Presença de respeito",
};
