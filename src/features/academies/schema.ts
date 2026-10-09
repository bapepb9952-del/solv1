import { z } from "zod";
export const academySchema = z.object({
  name: z.string().trim().min(2, "Informe pelo menos 2 caracteres.").max(100),
  timezone: z.string().refine((value) => {
    try { new Intl.DateTimeFormat("pt-BR", { timeZone: value }); return true; } catch { return false; }
  }, "Fuso horário inválido."),
});
