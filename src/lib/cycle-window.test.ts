import { describe, expect, it } from "vitest";
import { cycleWindow, formatCycleDate, manilaToday } from "./cycle-window";

describe("Manila application dates", () => {
  it("uses the Manila date at the UTC boundary", () => {
    expect(manilaToday(new Date("2026-12-31T16:00:00Z"))).toBe("2027-01-01");
  });
  it("is undated only when both dates are absent", () => {
    expect(cycleWindow(null, null)).toBe("undated");
    expect(cycleWindow("2026-01-01", null, new Date("2026-11-13T00:00:00Z"))).toBe("open");
  });
  it("opens and closes on Manila calendar dates", () => {
    expect(cycleWindow("2026-12-01", "2026-12-31", new Date("2026-11-30T15:59:00Z"))).toBe("upcoming");
    expect(cycleWindow("2026-12-01", "2026-12-31", new Date("2026-11-30T16:00:00Z"))).toBe("open");
    expect(cycleWindow(null, "2026-12-31", new Date("2026-12-31T15:59:59Z"))).toBe("open");
    expect(cycleWindow(null, "2026-12-31", new Date("2026-12-31T16:00:00Z"))).toBe("closed");
  });
  it("formats a calendar date without shifting it", () => {
    expect(formatCycleDate("2026-12-31")).toBe("31 Dec 2026");
  });
});
