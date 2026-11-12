import { describe, expect, it } from "vitest";
import { buildTsQuery } from "./query";

describe("buildTsQuery", () => {
  it("drops Filipino/English stopwords and short tokens, ORs the rest", () => {
    expect(buildTsQuery("Saan ako kukuha ng certificate of indigency?")).toBe("kukuha | certificate | indigency");
  });
  it("splits hyphenated words", () => {
    expect(buildTsQuery("Paano mag-apply sa DEMO scholarship?")).toBe("apply | demo | scholarship");
  });
  it("strips tsquery operators so input cannot inject syntax", () => {
    expect(buildTsQuery("foo' & !bar:* | (baz)")).toBe("foo | bar | baz");
  });
  it("dedupes and caps the number of terms", () => {
    expect(buildTsQuery("grades grades grades")).toBe("grades");
    expect(buildTsQuery("alpha bravo charlie delta", 2)).toBe("alpha | bravo");
  });
  it("returns null when nothing searchable remains", () => {
    expect(buildTsQuery("Ano ba?")).toBeNull();
  });
});
