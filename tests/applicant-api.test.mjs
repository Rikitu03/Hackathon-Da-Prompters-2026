import test from "node:test";
import assert from "node:assert/strict";
import {
  askGabay,
  askProductHelp,
  PRODUCT_NO_EVIDENCE_NOTICE,
  fetchGuides,
  request,
  reviewDocument,
  requestAiReview,
  NO_EVIDENCE_NOTICE,
  requirementFrom,
} from "../src/lib/applicant/api.ts";

test("product help sends no cycle/history and keeps document-section citations", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/ai/help");
    assert.deepEqual(JSON.parse(options.body), { message: "How do I use my checklist?" });
    return Response.json({ answer: "Use My checklist [1].", grounded: true, sources: [{ sourceId: "product-help:checklist:1", title: "Saving checklist progress" }] });
  });
  assert.equal((await askProductHelp("How do I use my checklist?")).sources[0].sourceId, "product-help:checklist:1");
});
test("product help preserves notices and replaces unsupported grounded claims", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ answer: "No evidence.", grounded: false, sources: [] }));
  assert.deepEqual(await askProductHelp("Question"), { kind: "notice", answer: "No evidence.", officialUrl: null });
  t.mock.method(globalThis, "fetch", async () => Response.json({ answer: "Claim.", grounded: true, sources: [] }));
  assert.equal((await askProductHelp("Question")).answer, PRODUCT_NO_EVIDENCE_NOTICE);
});
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
test("AI review posts the request and returns flags", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/ai/verify");
    assert.equal(options.method, "POST");
    assert.equal(JSON.parse(options.body).consent, true);
    return Response.json({ status: "ok", flags: [] });
  });
  assert.deepEqual(
    await requestAiReview({ consent: true, profileId: "school_id", fields: [], rawText: "", related: [] }),
    { status: "ok", flags: [] },
  );
});
test("AI review failures become an unavailable notice, never a rejection", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: "off" }, { status: 503 }));
  const r = await requestAiReview({ consent: true, profileId: "school_id", fields: [], rawText: "", related: [] });
  assert.equal(r.status, "unavailable");
  assert.match(r.message, /Lumen AI review/);
});
test("AI review treats a network failure or odd reply as unavailable", async (t) => {
  const input = { consent: true, profileId: "school_id", fields: [], rawText: "", related: [] };
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("network down"); });
  assert.equal((await requestAiReview(input)).status, "unavailable");
  t.mock.method(globalThis, "fetch", async () => Response.json({ status: "ok", flags: "nope" }));
  assert.equal((await requestAiReview(input)).status, "unavailable");
});


test("published requirement mapping carries verified office details and rejects unapproved map hosts", () => {
  const base={
    id:"r1",title:"Certified enrollment letter",description:"Sample requirement",
    position:0,is_required:true,requirement_steps:[{id:"s1",position:0,instruction:"Visit the registrar"}],faqs:[]
  };
  const withLocation=requirementFrom({...base,issuing_office:"Sample Registrar",
    office_address:"Example City, Philippines",office_hours:"Mon–Fri, 8 AM–5 PM",
    map_url:"https://www.google.com/maps?q=14.58,121.06"});
  assert.equal(withLocation.issuingOffice,"Sample Registrar");
  assert.equal(withLocation.officeAddress,"Example City, Philippines");
  assert.equal(withLocation.officeHours,"Mon–Fri, 8 AM–5 PM");
  assert.equal(withLocation.mapUrl,"https://www.google.com/maps?q=14.58,121.06");
  assert.equal(requirementFrom(base).mapUrl,"");
  assert.equal(requirementFrom({...base,map_url:"https://example.invalid/fake-pin"}).mapUrl,"");
});
