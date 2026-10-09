const DAY_MS = 86_400_000;

/** Calendar dates, not elapsed hours: DST cannot shift retention thresholds. */
export function daysBetween(from: string, to: string): number {
  return Math.max(0, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS));
}

export function dateInZone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function formatDate(date: string | null): string {
  if (!date) return "Ainda não treinou";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function formatDateTime(date: string, timezone: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(date));
}

export function trainingRecency(last: string | null, today: string): string {
  if (!last) return "Ainda não treinou";
  const days = daysBetween(last, today);
  return days === 0 ? "Hoje" : days === 1 ? "Ontem" : `Há ${days} dias`;
}
