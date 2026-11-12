import { describe, expect, it } from "vitest";
import { toPromptSources } from "./rank";

const CYCLE = "1b379905-4891-4820-8fe3-5eb2459043dc";
const REQ = "9a1f0f8e-2b1c-4c1e-9f6a-3d5e7a1b2c3d";

const row = (id: string, extra: Record<string, unknown> = {}, source: Record<string, unknown> = {}) => ({
  id,
  content: `Content ${id}`,
  requirement_id: null,
  position: 0,
  knowledge_sources: {
    id: `src-${id}`,
    title: `Title ${id}`,
    source_url: `https://example.com/${id}`,
    reviewed_at: "2026-11-12T16:47:25+00:00",
    cycle_id: CYCLE,
    ...source,
  },
  ...extra,
});

describe("toPromptSources", () => {
  it("maps rows to prompt sources keeping source id, title, url and review date", () => {
    expect(toPromptSources([row("a")], CYCLE)).toEqual([
      {
        sourceId: "src-a",
        title: "Title a",
        url: "https://example.com/a",
        reviewedAt: "2026-11-12T16:47:25+00:00",
        content: "Content a",
      },
    ]);
  });

  it("puts chunks for the selected requirement first, then by position", () => {
    const rows = [
      row("general-2", { position: 2 }),
      row("req", { requirement_id: REQ, position: 5 }),
      row("general-1", { position: 1 }),
    ];
    expect(toPromptSources(rows, CYCLE, REQ).map((s) => s.content)).toEqual([
      "Content req",
      "Content general-1",
      "Content general-2",
    ]);
  });

  it("drops rows from another cycle even if the query returned them", () => {
    const rows = [row("ours"), row("theirs", {}, { cycle_id: "00000000-0000-4000-8000-000000000000" })];
    expect(toPromptSources(rows, CYCLE).map((s) => s.content)).toEqual(["Content ours"]);
  });

  it("drops malformed rows and blank content instead of throwing", () => {
    const rows = [row("ok"), { id: "broken" }, row("blank", { content: "   " }), null];
    expect(toPromptSources(rows, CYCLE).map((s) => s.content)).toEqual(["Content ok"]);
  });

  it("accepts an embedded source returned as a one-element array", () => {
    const r = row("arr");
    const rows = [{ ...r, knowledge_sources: [r.knowledge_sources] }];
    expect(toPromptSources(rows, CYCLE)).toHaveLength(1);
  });

  it("returns an empty list for non-array input", () => {
    expect(toPromptSources(null, CYCLE)).toEqual([]);
  });
});
