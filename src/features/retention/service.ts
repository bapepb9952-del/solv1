import { daysBetween } from "@/lib/dates";

export type RetentionStatus = "ACTIVE" | "ATTENTION" | "RISK";
export const RETENTION_RULE = { version: 1, activeMaxDays: 7, attentionMaxDays: 14 } as const;
export const RETENTION_LABELS: Record<RetentionStatus, string> = {
  ACTIVE: "Ativo", ATTENTION: "Atenção", RISK: "Em risco",
};

export function retentionStatus(input: { lastTrainingOn: string | null; joinedOn: string; today: string }): {
  status: RetentionStatus; daysAbsent: number; basis: "LAST_TRAINING" | "REGISTRATION";
} {
  const daysAbsent = daysBetween(input.lastTrainingOn ?? input.joinedOn, input.today);
  return {
    status: daysAbsent <= RETENTION_RULE.activeMaxDays ? "ACTIVE" : daysAbsent <= RETENTION_RULE.attentionMaxDays ? "ATTENTION" : "RISK",
    daysAbsent,
    basis: input.lastTrainingOn ? "LAST_TRAINING" : "REGISTRATION",
  };
}
