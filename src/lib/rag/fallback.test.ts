import { describe, expect, it } from "vitest";
import { closedCycleAnswer, isCycleClosed, noEvidenceAnswer } from "./fallback";

describe("isCycleClosed", () => {
  it("is open when there is no end date", () => {
    expect(isCycleClosed(null, new Date("2030-01-01T00:00:00Z"))).toBe(false);
  });

  it("is open on the end date itself (Manila time)", () => {
    // 2026-12-31 15:00 UTC is 23:00 on 31 Dec in Manila
    expect(isCycleClosed("2026-12-31", new Date("2026-12-31T15:00:00Z"))).toBe(false);
  });

  it("is closed from the next Manila day, even while it is still the end date in UTC", () => {
    // 2026-12-31 16:30 UTC is 00:30 on 1 Jan in Manila
    expect(isCycleClosed("2026-12-31", new Date("2026-12-31T16:30:00Z"))).toBe(true);
  });
});

describe("refusal answers", () => {
  it("no-evidence answer is bilingual, ungrounded, cites nothing and links the official page", () => {
    const res = noEvidenceAnswer("https://example.com/official");
    expect(res.grounded).toBe(false);
    expect(res.sources).toEqual([]);
    expect(res.officialUrl).toBe("https://example.com/official");
    expect(res.answer).toMatch(/Hindi ko nakita/);
    expect(res.answer).toMatch(/couldn't find/);
  });

  it("omits officialUrl when the cycle has none", () => {
    expect(noEvidenceAnswer(null)).not.toHaveProperty("officialUrl");
  });

  it("closed-cycle answer names the end date and is ungrounded", () => {
    const res = closedCycleAnswer("2026-06-30", null);
    expect(res.grounded).toBe(false);
    expect(res.sources).toEqual([]);
    expect(res.answer).toContain("2026-06-30");
  });
});
