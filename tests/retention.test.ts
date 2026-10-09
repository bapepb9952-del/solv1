import { describe, expect, it } from "vitest";
import { retentionStatus } from "@/features/retention/service";
import { dateInZone, daysBetween } from "@/lib/dates";

describe("retention policy v1", () => {
  it.each([
    ["2026-10-09", "ACTIVE", 0], ["2026-10-02", "ACTIVE", 7],
    ["2026-10-01", "ATTENTION", 8], ["2026-09-25", "ATTENTION", 14],
    ["2026-09-24", "RISK", 15],
  ])("classifies last training %s", (lastTrainingOn, status, daysAbsent) => {
    expect(retentionStatus({ lastTrainingOn, joinedOn: "2026-01-01", today: "2026-10-09" }))
      .toEqual({ status, daysAbsent, basis: "LAST_TRAINING" });
  });
  it("uses registration for an untrained student and reports the basis", () => {
    expect(retentionStatus({ lastTrainingOn: null, joinedOn: "2026-10-01", today: "2026-10-09" }))
      .toEqual({ status: "ATTENTION", daysAbsent: 8, basis: "REGISTRATION" });
  });
  it("handles leap years and future dates without negative absence", () => {
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
    expect(daysBetween("2026-10-10", "2026-10-09")).toBe(0);
  });
  it("uses the academy's day across UTC midnight", () => {
    expect(dateInZone(new Date("2026-10-10T01:30:00Z"), "America/Sao_Paulo")).toBe("2026-10-09");
  });
});
