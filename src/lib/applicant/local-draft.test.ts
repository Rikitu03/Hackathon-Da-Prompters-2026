import { describe, expect, it } from "vitest";
import { blankDraftFields, localDraftSchema } from "./local-draft";
describe("local-only application draft format", () => {
  const draft = { version: 1, cycleId: "sample-cycle", programId: "sample-program", updatedAt: "2026-11-13T01:00:00Z", fields: { ...blankDraftFields, fullName: "Synthetic student" } };
  it("accepts an optional personal draft and survives serialization", () => {
    expect(localDraftSchema.parse(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
  });
  it("rejects unexpected fields, oversized notes, and invalid email", () => {
    expect(localDraftSchema.safeParse({ ...draft, fields: { ...draft.fields, governmentId: "not collected" } }).success).toBe(false);
    expect(localDraftSchema.safeParse({ ...draft, fields: { ...draft.fields, notes: "a".repeat(2001) } }).success).toBe(false);
    expect(localDraftSchema.safeParse({ ...draft, fields: { ...draft.fields, email: "invalid" } }).success).toBe(false);
  });
});
