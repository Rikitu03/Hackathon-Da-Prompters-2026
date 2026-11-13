import test from "node:test";
import assert from "node:assert/strict";
import {
  askGabay,
  fetchGuides,
  request,
  reviewDocument,
  NO_EVIDENCE_NOTICE,
} from "../src/lib/applicant/api.ts";

test("chat sends only the documented app-level contract and retains citations", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/ai/chat");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), {
      cycleId: "cycle-1",
      requirementId: "req-1",
      message: "How do I prepare?",
    });
    return Response.json({
      answer: "Read the published instructions.",
      grounded: true,
      sources: [
        {
          sourceId: "s1",
          title: "Published guide",
          url: "https://example.org/guide",
        },
      ],
    });
  });
  assert.equal(
    (await askGabay("cycle-1", "How do I prepare?", "req-1")).sources[0]
      .sourceId,
    "s1",
  );
});
test("server notices retain their text and safe official destination", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    answer: "This cycle ended on 2026-06-30.", grounded: false, sources: [], officialUrl: "https://example.org/apply",
  }));
  assert.deepEqual(await askGabay("cycle", "Question"), { kind: "notice", answer: "This cycle ended on 2026-06-30.", officialUrl: "https://example.org/apply" });
});
test("uncited grounded text becomes the fixed no-evidence notice", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ answer: "Unsupported claim", grounded: true, sources: [] }));
  assert.deepEqual(await askGabay("cycle", "Question"), { kind: "notice", answer: NO_EVIDENCE_NOTICE, officialUrl: null });
});
test("unsafe notice links are dropped", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ answer: "No evidence", grounded: false, sources: [], officialUrl: "javascript:alert(1)" }));
  assert.equal((await askGabay("cycle", "Question")).officialUrl, null);
});
test("a non-JSON platform timeout explains recovery", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html>504</html>", { status: 504 }));
  await assert.rejects(askGabay("cycle", "Question"), /didn't respond in time/);
});
test("HTTP failures keep their status and never return fabricated data", async (t) => {
  for (const status of [400, 413, 429, 500, 501, 503]) {
    const mock = t.mock.method(globalThis, "fetch", async () =>
      Response.json({ error: "Backend detail" }, { status }),
    );
    await assert.rejects(
      request("/api/test", undefined, "Ask Gabay"),
      (error) => error.status === status && error.message !== "Backend detail",
    );
    mock.mock.restore();
  }
});
test("malformed successful chat and OCR responses are rejected", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ unrelated: "payload" }),
  );
  await assert.rejects(askGabay("cycle", "Question"), /unexpected response/);
  await assert.rejects(
    reviewDocument(
      new File(["test"], "example.pdf", { type: "application/pdf" }),
    ),
    /unexpected format/,
  );
});
test("OCR uses multipart consent and returns editable normalized fields", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/ai/ocr");
    assert.ok(options.body instanceof FormData);
    assert.equal(options.body.get("consent"), "true");
    assert.equal(options.body.get("file").name, "fictional.pdf");
    assert.equal(options.headers, undefined);
    return Response.json({
      rawText: "Example text",
      fields: [
        { key: "year", label: "Year", value: "2026", needsReview: true, originalText: "Year: 2026", warnings: ["Check the year"] },
      ],
      warnings: ["Check your original"],
      disclaimer: "Automatically read text may contain errors.",
    });
  });
  const result = await reviewDocument(
    new File(["fictional"], "fictional.pdf", { type: "application/pdf" }),
  );
  assert.equal(result.fields[0].value, "2026");
  assert.equal(result.warnings.length, 1);
  assert.equal(result.fields[0].originalText, "Year: 2026");
  assert.deepEqual(result.fields[0].warnings, ["Check the year"]);
  assert.match(result.disclaimer, /may contain errors/);
});
test("discovery loads subsequent pages and excludes unpublished cycles", async (t) => {
  const cycle = {
    id: "cycle",
    academic_year: "Example",
    application_start: null,
    application_end: null,
    status: "published",
  };
  const program = (id) => ({
    id,
    title: `Guide ${id}`,
    description: "Published description",
    status: "published",
    application_cycles: [{ ...cycle, id: `c-${id}` }],
  });
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    return Response.json(
      url.endsWith("=1")
        ? { programs: [program("one"), program("two")], pageSize: 2 }
        : {
            programs: [{ ...program("hidden"), status: "draft" }],
            pageSize: 2,
          },
    );
  });
  const guides = await fetchGuides();
  assert.equal(calls.length, 2);
  assert.deepEqual(
    guides.map((g) => g.id),
    ["one", "two"],
  );
});
test("unavailable published data never silently becomes an illustrative guide", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: "Unavailable" }, { status: 503 }),
  );
  await assert.rejects(fetchGuides(), (error) => error.status === 503);
});
test("OCR sends the selected document profile and keeps its classification", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.body.get("profile"), "school_id");
    return Response.json({
      rawText: "", fields: [], warnings: [], disclaimer: "", profileId: "school_id",
      detected: { detected: "school_id", variant: "government_id", evidence: "PHILIPPINE IDENTIFICATION CARD" },
    });
  });
  const file = new File([new Uint8Array([1])], "id.png", { type: "image/png" });
  assert.equal((await reviewDocument(file, undefined, "school_id")).detected.variant, "government_id");
});
test("OCR without a profile sends no profile field", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.body.has("profile"), false);
    return Response.json({ rawText: "", fields: [], warnings: [], disclaimer: "" });
  });
  const file = new File([new Uint8Array([1])], "id.png", { type: "image/png" });
  assert.equal((await reviewDocument(file)).profileId, undefined);
});
